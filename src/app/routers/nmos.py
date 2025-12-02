from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from urllib.parse import urljoin, urlsplit, urlunsplit
from app.auth import require_roles
from app.nmos_client import (
    normalize_base_url,
    fetch_json,
    fetch_text,
    parse_sdp_details,
    fetch_connection_params,
    parse_host_port,
    DEFAULT_IS04_VERSION,
    DEFAULT_IS05_VERSION
)

router = APIRouter()


def ensure_x_nmos_segment(url: str) -> str:
    """Ensure returned base URL keeps (or appends) the /x-nmos segment."""
    if not url:
        return url
    parts = urlsplit(url)
    path = parts.path or ""
    lower_path = path.lower()
    idx = lower_path.find("/x-nmos")
    if idx != -1:
        path = path[:idx + len("/x-nmos")]
    else:
        if not path:
            path = "/x-nmos"
        else:
            if not path.endswith("/"):
                path += "/"
            path += "x-nmos"
    if not path.endswith("/"):
        path += "/"
    return urlunsplit((parts.scheme, parts.netloc, path, "", ""))


class DiscoverRequest(BaseModel):
    is04_base_url: str
    is05_base_url: str
    is04_version: str = DEFAULT_IS04_VERSION
    is05_version: str = DEFAULT_IS05_VERSION
    timeout: int = 5


class DetectIS05Request(BaseModel):
    is04_base_url: str
    is04_version: str = DEFAULT_IS04_VERSION
    timeout: int = 5


class DetectIS04FromRDSRequest(BaseModel):
    rds_base_url: str
    rds_version: str = DEFAULT_IS04_VERSION
    timeout: int = 5


@router.post("/nmos/discover")
def discover_nmos_flows(payload: DiscoverRequest, user=Depends(require_roles("editor", "admin"))):
    is04_base = normalize_base_url(payload.is04_base_url)
    is05_base = normalize_base_url(payload.is05_base_url)
    version = payload.is04_version.strip() or "v1.3"
    conn_version = payload.is05_version.strip() or "v1.1"
    node_prefix = f"node/{version}/"
    flows_url = urljoin(is04_base, node_prefix + "flows")
    senders_url = urljoin(is04_base, node_prefix + "senders")
    self_url = urljoin(is04_base, node_prefix + "self")

    node_info = fetch_json(self_url, payload.timeout)
    flows = fetch_json(flows_url, payload.timeout)
    senders = fetch_json(senders_url, payload.timeout)
    is04_host, is04_port = parse_host_port(payload.is04_base_url)
    is05_host, is05_port = parse_host_port(payload.is05_base_url)

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
        sdp_cache = fetch_text(manifest_href, payload.timeout)
        parsed = parse_sdp_details(sdp_cache) if sdp_cache else {}
        connection_params = []
        if primary_sender and primary_sender.get("id"):
            connection_params = fetch_connection_params(
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
            "nmos_is04_base_url": is04_base,
            "nmos_is05_host": is05_host,
            "nmos_is05_port": is05_port,
            "nmos_is05_base_url": is05_base,
            "nmos_is04_version": version,
            "nmos_is05_version": conn_version,
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


@router.post("/nmos/detect-is05")
def detect_is05_endpoints(payload: DetectIS05Request, user=Depends(require_roles("editor", "admin"))):
    """
    Detect IS-05 Connection API endpoints from IS-04 devices.
    Returns a list of available IS-05 endpoints with device information.
    """
    is04_base = normalize_base_url(payload.is04_base_url)
    version = payload.is04_version.strip() or DEFAULT_IS04_VERSION
    node_prefix = f"node/{version}/"
    devices_url = urljoin(is04_base, node_prefix + "devices")

    try:
        devices = fetch_json(devices_url, payload.timeout)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch devices from IS-04: {str(e)}")

    if not isinstance(devices, list):
        raise HTTPException(status_code=400, detail="Invalid devices response from IS-04")

    options = []
    seen_urls = set()

    for device in devices:
        if not isinstance(device, dict):
            continue

        device_id = device.get("id", "")
        device_label = device.get("label", device_id)
        controls = device.get("controls", [])

        if not isinstance(controls, list):
            continue

        # Find IS-05 (Connection API) controls
        is05_controls = []
        for control in controls:
            if not isinstance(control, dict):
                continue
            ctrl_type = control.get("type", "")
            href = control.get("href", "")
            # Check if this is a Connection API control
            if "urn:x-nmos:control:sr-ctrl" in ctrl_type and href:
                # Extract version from href if present
                version_match = None
                if "/v1." in href:
                    # Extract version like v1.0, v1.1, v1.2
                    import re
                    match = re.search(r'/v(\d+\.\d+)', href)
                    if match:
                        version_match = f"v{match.group(1)}"

                is05_controls.append({
                    "href": href,
                    "version": version_match
                })

        if not is05_controls:
            continue

        # Get the latest version (sort by version number)
        if len(is05_controls) > 1:
            # Sort by version, latest first
            def version_key(ctrl):
                v = ctrl.get("version")
                if v and v.startswith("v"):
                    try:
                        return float(v[1:])
                    except:
                        return 0.0
                return 0.0

            is05_controls.sort(key=version_key, reverse=True)

        # Use the latest (first after sorting)
        latest_control = is05_controls[0]
        is05_url = latest_control["href"].rstrip("/")

        # Remove version suffix and API endpoint suffix (like /connection) from URL to get base URL
        import re
        base_url = re.sub(r'/v\d+\.\d+/?$', '', is05_url)
        base_url = re.sub(r'/connection/?$', '', base_url)
        if not base_url:
            base_url = is05_url

        base_url = ensure_x_nmos_segment(base_url)

        # Avoid duplicates
        if base_url in seen_urls:
            continue
        seen_urls.add(base_url)

        options.append({
            "device_id": device_id,
            "device_label": device_label,
            "is05_url": base_url,
            "version": latest_control.get("version") or "unknown"
        })

    return {
        "options": options,
        "count": len(options)
    }


@router.post("/nmos/detect-is04-from-rds")
def detect_is04_from_rds(payload: DetectIS04FromRDSRequest, user=Depends(require_roles("editor", "admin"))):
    """
    Detect IS-04 Node API endpoints from RDS (IS-04 Query API).
    Returns a list of nodes with their IS-04 Registration API URLs.
    """
    rds_base = normalize_base_url(payload.rds_base_url)
    version = payload.rds_version.strip() or DEFAULT_IS04_VERSION
    query_prefix = f"query/{version}/"
    nodes_url = urljoin(rds_base, query_prefix + "nodes")

    try:
        nodes = fetch_json(nodes_url, payload.timeout)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch nodes from RDS: {str(e)}")

    if not isinstance(nodes, list):
        raise HTTPException(status_code=400, detail="Invalid nodes response from RDS")

    node_options = []
    seen_urls = set()

    for node in nodes:
        if not isinstance(node, dict):
            continue

        node_id = node.get("id", "")
        node_label = node.get("label", node_id)
        href = node.get("href", "")

        if not href:
            continue

        # The href field contains the IS-04 Node API (Registration API) base URL
        # Remove trailing slash and version suffix to get base URL
        import re
        base_url = href.rstrip("/")
        # Extract base URL up to /x-nmos/ (remove /node/v1.x part)
        base_url = re.sub(r'/node/v\d+\.\d+/?.*$', '', base_url)

        # Extract version from href if present
        version_match = None
        if "/v1." in href:
            match = re.search(r'/v(\d+\.\d+)', href)
            if match:
                version_match = f"v{match.group(1)}"

        base_url = ensure_x_nmos_segment(base_url)

        # Avoid duplicates
        if base_url in seen_urls:
            continue
        seen_urls.add(base_url)

        node_options.append({
            "id": node_id,
            "label": node_label,
            "is04_url": base_url,
            "version": version_match or "unknown"
        })

    return {
        "nodes": node_options,
        "count": len(node_options)
    }
