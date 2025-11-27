import requests
from urllib.parse import urljoin, urlparse
from fastapi import HTTPException

DEFAULT_IS04_VERSION = "v1.3"
DEFAULT_IS05_VERSION = "v1.1"


def normalize_base_url(url: str) -> str:
    url = url.strip()
    if not url.endswith("/"):
        url += "/"
    return url


def fetch_json(url: str, timeout: int):
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch {url}: {exc}") from exc


def fetch_text(url: str | None, timeout: int) -> str | None:
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp.text
    except requests.exceptions.RequestException:
        return None


def parse_sdp_details(sdp_text: str | None) -> dict:
    result = {}
    if not sdp_text:
        return result
    for raw_line in sdp_text.splitlines():
        line = raw_line.strip()
        if not line or "=" not in line:
            continue
        prefix, _, rest = line.partition("=")
        if prefix == "m":
            parts = rest.split()
            if parts:
                result.setdefault("media_type", parts[0])
            if len(parts) >= 2:
                try:
                    result.setdefault("group_port_a", int(parts[1]))
                except ValueError:
                    pass
        elif prefix == "c":
            parts = rest.split()
            if parts:
                addr = parts[-1]
                if "/" in addr:
                    addr = addr.split("/")[0]
                result.setdefault("multicast_addr_a", addr)
        elif prefix == "a":
            if rest.startswith("source-filter:"):
                _, _, content = rest.partition(":")
                tokens = content.strip().split()
                if len(tokens) >= 5:
                    maddr = tokens[3]
                    src = tokens[4]
                    if "/" in maddr:
                        maddr = maddr.split("/")[0]
                    result.setdefault("source_addr_a", src)
                    result.setdefault("multicast_addr_a", maddr)
            elif rest.startswith("rtpmap:"):
                parts = rest.split()
                if len(parts) >= 2:
                    encoding = parts[1]
                    if "/" in encoding:
                        encoding = encoding.split("/")[0]
                    result.setdefault("media_type", encoding)
            elif rest.startswith("group:"):
                result.setdefault("redundancy_group", rest)
    return result


def parse_host_port(url: str):
    parsed = urlparse(url if "://" in url else f"http://{url}")
    host = parsed.hostname
    port = parsed.port
    if not port:
        port = 443 if parsed.scheme == "https" else 80
    return host, port


def fetch_connection_params(base: str, version: str, sender_id: str, timeout: int):
    base = normalize_base_url(base)
    paths = [
        f"connection/{version}/single/senders/{sender_id}/active/",
        f"connection/{version}/single/senders/{sender_id}/staged/"
    ]
    data = None
    for path in paths:
        url = urljoin(base, path)
        try:
            data = fetch_json(url, timeout)
            break
        except HTTPException:
            continue
    if data is None:
        raise HTTPException(
            status_code=400,
            detail=f"IS-05 endpoint missing for sender {sender_id}. "
                   f"Check version '{version}' or base URL."
        )
    params = data.get("transport_params") if isinstance(data, dict) else None
    if isinstance(params, list):
        return params
    return []


def build_base_from_host_port(host: str | None, port: int | None, scheme: str = "http") -> str | None:
    if not host:
        return None
    host = host.strip()
    if host.startswith("http://") or host.startswith("https://"):
        base = host
    else:
        base = f"{scheme}://{host}"
    if port:
        parsed = urlparse(base)
        if not parsed.port:
            base = f"{parsed.scheme}://{parsed.hostname}:{port}"
    return normalize_base_url(base)


def _compose_flow_entry(flow: dict, node_info: dict, sender: dict | None, parsed: dict, sdp_cache: str | None,
                        connection_params: list, is04_host: str | None, is04_port: int | None,
                        is05_host: str | None, is05_port: int | None):
    path_a = connection_params[0] if len(connection_params) >= 1 else {}
    path_b = connection_params[1] if len(connection_params) >= 2 else {}

    def pick_path(path, key):
        return path.get(key) if isinstance(path, dict) else None

    source_addr_a = pick_path(path_a, "source_ip") or parsed.get("source_addr_a")
    source_addr_b = pick_path(path_b, "source_ip")
    multicast_addr_a = pick_path(path_a, "destination_ip") or parsed.get("multicast_addr_a")
    multicast_addr_b = pick_path(path_b, "destination_ip")
    group_port_a = pick_path(path_a, "destination_port") or parsed.get("group_port_a")
    group_port_b = pick_path(path_b, "destination_port")
    source_port_a = pick_path(path_a, "source_port")
    source_port_b = pick_path(path_b, "source_port")
    media_type = pick_path(path_a, "media_type") or parsed.get("media_type") or flow.get("media_type")
    redundancy_group = parsed.get("redundancy_group")
    return {
        "nmos_flow_id": flow.get("id"),
        "label": flow.get("label") or flow.get("id"),
        "description": flow.get("description"),
        "nmos_node_label": node_info.get("label") if isinstance(node_info, dict) else None,
        "nmos_node_description": node_info.get("description") if isinstance(node_info, dict) else None,
        "nmos_node_id": node_info.get("id") if isinstance(node_info, dict) else None,
        "format": flow.get("format"),
        "nmos_device_id": flow.get("device_id"),
        "nmos_sender_id": sender.get("id") if sender else None,
        "sender_transport": sender.get("transport") if sender else None,
        "sender_manifest": sender.get("manifest_href") if sender else None,
        "source_addr_a": source_addr_a,
        "source_addr_b": source_addr_b,
        "source_port_a": source_port_a,
        "source_port_b": source_port_b,
        "multicast_addr_a": multicast_addr_a,
        "multicast_addr_b": multicast_addr_b,
        "group_port_a": group_port_a,
        "group_port_b": group_port_b,
        "media_type": media_type,
        "st2110_format": flow.get("format"),
        "redundancy_group": redundancy_group,
        "sdp_url": sender.get("manifest_href") if sender else None,
        "sdp_cache": sdp_cache,
        "nmos_is04_host": is04_host,
        "nmos_is04_port": is04_port,
        "nmos_is05_host": is05_host,
        "nmos_is05_port": is05_port,
    }


def fetch_flow_snapshot(
    *,
    flow_id: str,
    is04_base_url: str,
    is05_base_url: str,
    sender_id: str | None = None,
    timeout: int = 5,
    is04_version: str = DEFAULT_IS04_VERSION,
    is05_version: str = DEFAULT_IS05_VERSION
) -> dict:
    base04 = normalize_base_url(is04_base_url)
    base05 = normalize_base_url(is05_base_url)
    node_prefix = f"node/{is04_version}/"
    flow_endpoint = urljoin(base04, node_prefix + f"flows/{flow_id}")
    node_endpoint = urljoin(base04, node_prefix + "self")

    flow_data = fetch_json(flow_endpoint, timeout)
    node_info = fetch_json(node_endpoint, timeout)

    sender = None
    if sender_id:
        sender_endpoint = urljoin(base04, node_prefix + f"senders/{sender_id}")
        try:
            sender = fetch_json(sender_endpoint, timeout)
        except HTTPException:
            sender = None
    if not sender:
        senders_endpoint = urljoin(base04, node_prefix + "senders")
        senders = fetch_json(senders_endpoint, timeout)
        for entry in senders or []:
            if entry.get("flow_id") == flow_id:
                sender = entry
                break

    manifest_href = sender.get("manifest_href") if sender else None
    sdp_cache = fetch_text(manifest_href, timeout) if manifest_href else None
    parsed = parse_sdp_details(sdp_cache) if sdp_cache else {}
    connection_params = []
    if sender and sender.get("id"):
        connection_params = fetch_connection_params(is05_base_url, is05_version, sender["id"], timeout)

    is04_host, is04_port = parse_host_port(is04_base_url)
    is05_host, is05_port = parse_host_port(is05_base_url)
    entry = _compose_flow_entry(
        flow_data if isinstance(flow_data, dict) else {},
        node_info if isinstance(node_info, dict) else {},
        sender,
        parsed,
        sdp_cache,
        connection_params,
        is04_host,
        is04_port,
        is05_host,
        is05_port
    )
    entry["nmos_is04_version"] = is04_version
    entry["nmos_is05_version"] = is05_version
    entry["nmos_is04_base_url"] = base04
    entry["nmos_is05_base_url"] = base05
    entry["raw_flow"] = flow_data
    entry["raw_sender"] = sender
    entry["node"] = node_info
    return entry
