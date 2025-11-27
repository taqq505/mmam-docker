from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from urllib.parse import urljoin
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


class DiscoverRequest(BaseModel):
    is04_base_url: str
    is05_base_url: str
    is04_version: str = DEFAULT_IS04_VERSION
    is05_version: str = DEFAULT_IS05_VERSION
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
