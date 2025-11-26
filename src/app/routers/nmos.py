from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from urllib.parse import urljoin, urlparse
import requests

from app.auth import require_roles

router = APIRouter()


class DiscoverRequest(BaseModel):
    is04_base_url: str
    is05_base_url: str
    is04_version: str = "v1.3"
    is05_version: str = "v1.1"
    timeout: int = 5


def _normalize_base_url(url: str) -> str:
    url = url.strip()
    if not url.endswith("/"):
        url += "/"
    return url


def _fetch_json(url: str, timeout: int):
    print(f"[nmos] GET {url}")
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        print(f"[nmos] {url} -> {resp.status_code}")
        return resp.json()
    except requests.exceptions.RequestException as exc:
        print(f"[nmos] ERROR {url}: {exc}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch {url}: {exc}") from exc


def _fetch_text(url: str, timeout: int) -> str | None:
    print(f"[nmos] GET (text) {url}")
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        print(f"[nmos] {url} -> {resp.status_code}")
        return resp.text
    except requests.exceptions.RequestException as exc:
        print(f"[nmos] ERROR {url}: {exc}")
        return None


def _parse_sdp_details(sdp_text: str) -> dict:
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


def _parse_host_port(url: str):
    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port
    if not port:
        port = 443 if parsed.scheme == "https" else 80
    return host, port


def _fetch_connection_params(base: str, version: str, sender_id: str, timeout: int):
    base = _normalize_base_url(base)
    paths = [
        f"connection/{version}/single/senders/{sender_id}/active/",
        f"connection/{version}/single/senders/{sender_id}/staged/"
    ]
    data = None
    for path in paths:
        url = urljoin(base, path)
        try:
            data = _fetch_json(url, timeout)
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


@router.post("/nmos/discover")
def discover_nmos_flows(payload: DiscoverRequest, user=Depends(require_roles("editor", "admin"))):
    is04_base = _normalize_base_url(payload.is04_base_url)
    is05_base = _normalize_base_url(payload.is05_base_url)
    version = payload.is04_version.strip() or "v1.3"
    conn_version = payload.is05_version.strip() or "v1.1"
    node_prefix = f"node/{version}/"
    flows_url = urljoin(is04_base, node_prefix + "flows")
    senders_url = urljoin(is04_base, node_prefix + "senders")
    self_url = urljoin(is04_base, node_prefix + "self")

    node_info = _fetch_json(self_url, payload.timeout)
    flows = _fetch_json(flows_url, payload.timeout)
    senders = _fetch_json(senders_url, payload.timeout)
    is04_host, is04_port = _parse_host_port(payload.is04_base_url)
    is05_host, is05_port = _parse_host_port(payload.is05_base_url)

    sender_map = {}
    for sender in senders or []:
        flow_id = sender.get("flow_id")
        if flow_id:
            sender_map.setdefault(flow_id, []).append(sender)

    results = []
    for flow in flows or []:
        flow_id = flow.get("id")
        linked_senders = sender_map.get(flow_id, [])
        primary_sender = linked_senders[0] if linked_senders else None
        manifest_href = primary_sender.get("manifest_href") if primary_sender else None
        sdp_cache = None
        parsed = {}
        if manifest_href:
            sdp_cache = _fetch_text(manifest_href, payload.timeout)
            parsed = _parse_sdp_details(sdp_cache) if sdp_cache else {}
        connection_params = []
        if primary_sender and primary_sender.get("id"):
            connection_params = _fetch_connection_params(
                payload.is05_base_url,
                conn_version,
                primary_sender["id"],
                payload.timeout
            )

        path_a = connection_params[0] if len(connection_params) >= 1 else {}
        path_b = connection_params[1] if len(connection_params) >= 2 else {}

        def pick_path(path, key):
            value = path.get(key)
            return value

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
        results.append({
            "nmos_flow_id": flow_id,
            "label": flow.get("label") or flow_id,
            "description": flow.get("description"),
            "node_label": node_info.get("label") if isinstance(node_info, dict) else None,
            "node_description": node_info.get("description") if isinstance(node_info, dict) else None,
            "nmos_node_label": node_info.get("label") if isinstance(node_info, dict) else None,
            "nmos_node_description": node_info.get("description") if isinstance(node_info, dict) else None,
            "format": flow.get("format"),
            "tags": flow.get("tags"),
            "source_id": flow.get("source_id"),
            "parents": flow.get("parents"),
            "version": flow.get("version"),
            "nmos_device_id": flow.get("device_id"),
            "nmos_node_id": node_info.get("id") if isinstance(node_info, dict) else None,
            "nmos_sender_id": primary_sender.get("id") if primary_sender else None,
            "sender_transport": primary_sender.get("transport") if primary_sender else None,
            "sender_manifest": primary_sender.get("manifest_href") if primary_sender else None,
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
            "sdp_url": manifest_href,
            "sdp_cache": sdp_cache,
            "nmos_is04_host": is04_host,
            "nmos_is04_port": is04_port,
            "nmos_is05_host": is05_host,
            "nmos_is05_port": is05_port,
            "raw_flow": flow,
            "raw_sender": linked_senders
        })

    return {
        "is04_base_url": payload.is04_base_url,
        "is05_base_url": payload.is05_base_url,
        "is04_version": version,
        "is05_version": conn_version,
        "node": node_info,
        "flows": results
    }
