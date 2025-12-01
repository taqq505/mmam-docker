from bisect import bisect_left
from ipaddress import ip_address, ip_network, IPv4Address, IPv4Network
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from psycopg2 import errors

from app.auth import require_roles
from app.db import get_db_connection

STATE_FREE = "FREE"
STATE_USED = "USED"
STATE_RESERVED = "RESERVED"

router = APIRouter()


def _parse_scope(scope: str) -> IPv4Network:
    try:
        network = ip_network(scope, strict=False)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scope / CIDR")
    if network.version != 4:
        raise HTTPException(status_code=400, detail="Only IPv4 multicast scopes are supported")
    if not 8 <= network.prefixlen <= 31:
        raise HTTPException(status_code=400, detail="Prefix length must be between /8 and /31")
    return network


def _build_window(scope: Optional[str], start_ip: Optional[str], end_ip: Optional[str]):
    if scope:
        network = _parse_scope(scope)
        return {
            "label": str(network),
            "start_ip": network.network_address,
            "end_ip": network.broadcast_address,
            "start_int": int(network.network_address),
            "end_int": int(network.broadcast_address),
            "total": network.num_addresses,
            "prefix": network.prefixlen
        }
    if start_ip and end_ip:
        try:
            start = ip_address(start_ip)
            end = ip_address(end_ip)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid IPv4 address for range_start/range_end")
        if start.version != 4 or end.version != 4:
            raise HTTPException(status_code=400, detail="Only IPv4 ranges are supported")
        start_int = int(start)
        end_int = int(end)
        if start_int > end_int:
            raise HTTPException(status_code=400, detail="range_start must be <= range_end")
        return {
            "label": f"{start}/{end}",
            "start_ip": start,
            "end_ip": end,
            "start_int": start_int,
            "end_int": end_int,
            "total": end_int - start_int + 1,
            "prefix": None
        }
    raise HTTPException(status_code=400, detail="Provide either scope or range_start/range_end")


def _parse_center(center: Optional[str], window: Dict) -> Tuple[int, IPv4Address]:
    if not center:
        return 0, window["start_ip"]
    try:
        addr = ip_address(center)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid center address")
    addr_int = int(addr)
    if addr.version != 4 or not (window["start_int"] <= addr_int <= window["end_int"]):
        raise HTTPException(status_code=400, detail="Center address must be inside the selected scope")
    center_index = addr_int - window["start_int"]
    return center_index, addr


def _count_used_between(sorted_indices: List[int], start_idx: int, end_idx: int) -> int:
    if end_idx < start_idx:
        return 0
    left = bisect_left(sorted_indices, start_idx)
    right = bisect_left(sorted_indices, end_idx + 1)
    return max(0, right - left)


def _summarize_buckets(blocks: List[Dict], window: Dict, used_indices: List[int]):
    base_int = window["start_int"]
    window_start = base_int
    window_end = window["end_int"]
    parents = []
    children = []
    for block in blocks:
        if block["kind"] not in ("parent", "child"):
            continue
        block_start = block["start_int"]
        block_end = block["end_int"]
        if block_end < window_start or block_start > window_end:
            continue
        overlap_start = max(block_start, window_start)
        overlap_end = min(block_end, window_end)
        relative_start = overlap_start - base_int
        relative_end = overlap_end - base_int
        used_count = _count_used_between(used_indices, relative_start, relative_end)
        overlap_size = relative_end - relative_start + 1
        summary = {
            **block,
            "overlap_start_ip": str(IPv4Address(overlap_start)),
            "overlap_end_ip": str(IPv4Address(overlap_end)),
            "overlap_size": overlap_size,
            "used_in_scope": used_count,
            "usage_ratio": (used_count / overlap_size) if overlap_size > 0 else 0.0
        }
        if block["kind"] == "parent":
            parents.append(summary)
        else:
            children.append(summary)
    return parents, children


def _fetch_blocks():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, kind, privilege_id, parent_id, start_ip::TEXT, end_ip::TEXT, start_int, end_int, size, description, memo, color, cidr, is_reserved
        FROM address_buckets
        ORDER BY start_int ASC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    blocks = []
    for row in rows:
        blocks.append({
            "id": row[0],
            "kind": row[1],
            "privilege_id": row[2],
            "parent_id": row[3],
            "start_ip": row[4],
            "end_ip": row[5],
            "start_int": row[6],
            "end_int": row[7],
            "size": row[8],
            "description": row[9],
            "memo": row[10],
            "color": row[11],
            "cidr": row[12],
            "is_reserved": row[13]
        })
    return blocks


def _fetch_flow_addresses(window: Dict):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            flow_id,
            display_name,
            alias1,
            alias2,
            alias3,
            alias4,
            multicast_addr_a,
            multicast_addr_b,
            flow_status,
            availability,
            nmos_node_label
        FROM flows;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    base_int = window["start_int"]
    end_int = window["end_int"]
    used: Dict[int, List[Dict]] = {}

    def add_entry(address: Optional[str], path_label: str, row_data):
        if not address:
            return
        try:
            addr_obj = ip_address(address)
        except ValueError:
            return
        addr_val = int(addr_obj)
        if addr_obj.version != 4 or addr_val < window["start_int"] or addr_val > end_int:
            return
        idx = addr_val - base_int
        alias = next((value for value in row_data[2:6] if value), None)
        entry = {
            "flow_id": row_data[0],
            "display_name": row_data[1],
            "alias": alias,
            "path": path_label,
            "flow_status": row_data[8],
            "availability": row_data[9],
            "nmos_node_label": row_data[10]
        }
        used.setdefault(idx, []).append(entry)

    for row in rows:
        add_entry(row[6], "A", row)
        add_entry(row[7], "B", row)

    return used


def _reserved_segments(blocks: List[Dict], window: Dict):
    base_int = window["start_int"]
    network_start = window["start_int"]
    network_end = window["end_int"]
    reserved = []
    for block in blocks:
        if not block["is_reserved"] or block["kind"] != "child":
            continue
        block_start = block["start_int"]
        block_end = block["end_int"]
        if block_end < network_start or block_start > network_end:
            continue
        start_idx = max(block_start, network_start) - base_int
        end_idx = min(block_end, network_end) - base_int + 1
        if start_idx >= end_idx:
            continue
        reserved.append({
            "start": start_idx,
            "end": end_idx,
            "block": block
        })
    return reserved


def _build_segments(total: int, used_indices: List[int], reserved_segments: List[Dict]):
    if total <= 0:
        return [], 0

    boundaries = {0, total}
    for idx in used_indices:
        boundaries.add(idx)
        boundaries.add(idx + 1)
    for seg in reserved_segments:
        start = max(0, seg["start"])
        end = min(total, seg["end"])
        if start >= end:
            continue
        boundaries.add(start)
        boundaries.add(end)
    sorted_boundaries = sorted(boundaries)

    events: Dict[int, Dict[str, List[int]]] = {}
    for seg in reserved_segments:
        start = max(0, seg["start"])
        end = min(total, seg["end"])
        if start >= end:
            continue
        events.setdefault(start, {"begin": [], "end": []})["begin"].append(seg["block"]["id"])
        events.setdefault(end, {"begin": [], "end": []})["end"].append(seg["block"]["id"])

    used_sorted = sorted(used_indices)
    used_pointer = 0
    segments = []
    reserved_count = 0
    active_blocks: Dict[int, None] = {}

    for idx in range(len(sorted_boundaries) - 1):
        start = sorted_boundaries[idx]
        # end events first to drop segments ending at this boundary
        for block_id in events.get(start, {}).get("end", []):
            active_blocks.pop(block_id, None)
        # begin events
        for block_id in events.get(start, {}).get("begin", []):
            active_blocks[block_id] = None

        end = sorted_boundaries[idx + 1]
        if start >= end:
            continue

        used_pointer = bisect_left(used_sorted, start, used_pointer)
        interval_has_used = used_pointer < len(used_sorted) and used_sorted[used_pointer] < end
        if interval_has_used:
            state = STATE_USED
        elif active_blocks:
            state = STATE_RESERVED
            reserved_count += end - start
        else:
            state = STATE_FREE

        segment = {
            "start": start,
            "length": end - start,
            "state": state
        }
        if state == STATE_RESERVED:
            segment["block_ids"] = list(active_blocks.keys())
        segments.append(segment)

    return segments, reserved_count


@router.get("/address/buckets/overview")
def bucket_overview(
    scope: Optional[str] = Query("232.0.0.0/8", description="CIDR scope to inspect"),
    range_start: Optional[str] = Query(None),
    range_end: Optional[str] = Query(None),
    user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows"))
):
    window = _build_window(None if (range_start and range_end) else scope, range_start, range_end)
    blocks = _fetch_blocks()
    used_map = _fetch_flow_addresses(window)
    used_indices = sorted(used_map.keys())
    parents, children = _summarize_buckets(blocks, window, used_indices)
    return {
        "window": {
            "label": window["label"],
            "start": str(window["start_ip"]),
            "end": str(window["end_ip"]),
            "prefix": window["prefix"],
            "total": window["total"]
        },
        "parents": parents,
        "children": children
    }


@router.get("/address-map")
def address_map(
    scope: Optional[str] = Query("232.0.0.0/8", description="CIDR scope to inspect"),
    range_start: Optional[str] = Query(None, description="Optional start IP when not using CIDR"),
    range_end: Optional[str] = Query(None, description="Optional end IP when not using CIDR"),
    center: Optional[str] = Query(None, description="Optional center address for UI hints"),
    user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows"))
):
    window = _build_window(None if (range_start and range_end) else scope, range_start, range_end)
    center_index, center_addr = _parse_center(center, window)

    blocks = _fetch_blocks()
    used_map = _fetch_flow_addresses(window)
    reserved_segments = _reserved_segments(blocks, window)

    total = window["total"]
    used_indices = list(used_map.keys())
    segments, reserved_count = _build_segments(total, used_indices, reserved_segments)
    used_count = len(used_indices)
    free_count = max(0, total - used_count - reserved_count)

    base_int = window["start_int"]
    used_details = []
    for index, flows in sorted(used_map.items()):
        addr = IPv4Address(base_int + index)
        used_details.append({
            "index": index,
            "address": str(addr),
            "state": STATE_USED,
            "flows": flows
        })

    reserved_details = []
    for seg in reserved_segments:
        start = max(0, seg["start"])
        end = min(total, seg["end"])
        if start >= end:
            continue
        reserved_details.append({
            "start": start,
            "length": end - start,
            "address": str(IPv4Address(base_int + start)),
            "end_address": str(IPv4Address(base_int + end - 1)),
            "block": seg["block"]
        })

    return {
        "scope": {
            "label": window["label"],
            "start": str(window["start_ip"]),
            "end": str(window["end_ip"]),
            "prefix": window["prefix"],
            "total": total,
            "start_int": base_int
        },
        "center_index": center_index,
        "center_address": str(center_addr),
        "counts": {
            "total": total,
            "used": used_count,
            "reserved": reserved_count,
            "free": free_count
        },
        "segments": segments,
        "used_details": used_details,
        "reserved_segments": reserved_details,
        "blocks": blocks
    }


class ParentBucketPayload(BaseModel):
    start_ip: Optional[str] = None
    end_ip: Optional[str] = None
    description: Optional[str] = None
    memo: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None
    cidr: Optional[str] = None


class ChildBucketPayload(BaseModel):
    start_ip: Optional[str] = None
    end_ip: Optional[str] = None
    description: Optional[str] = None
    memo: Optional[str] = None
    color: Optional[str] = None
    parent_id: int
    is_reserved: bool = False
    cidr: Optional[str] = None


class BucketUpdatePayload(BaseModel):
    description: Optional[str] = None
    memo: Optional[str] = None
    color: Optional[str] = None
    is_reserved: Optional[bool] = None
    parent_id: Optional[int] = None


class AddressBucketBackupEntry(BaseModel):
    id: int
    kind: str
    privilege_id: Optional[int] = None
    parent_id: Optional[int] = None
    start_ip: str
    end_ip: str
    description: Optional[str] = None
    memo: Optional[str] = None
    color: Optional[str] = None
    cidr: Optional[str] = None
    is_reserved: Optional[bool] = False


class AddressBucketBackupPayload(BaseModel):
    buckets: List[AddressBucketBackupEntry]


def _ip_to_int(ip_str: str) -> int:
    try:
        return int(ip_address(ip_str))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid IPv4 address: {ip_str}")


def _int_to_ip(value: int) -> str:
    return str(IPv4Address(value))


def _range_from_cidr(cidr_value: str):
    try:
        network = ip_network(cidr_value, strict=False)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid CIDR: {cidr_value}")
    start_ip = str(network.network_address)
    end_ip = str(network.broadcast_address)
    start_int = int(network.network_address)
    end_int = int(network.broadcast_address)
    size = network.num_addresses
    return start_ip, end_ip, start_int, end_int, size, str(network)


def _bucket_to_dict(row):
    return {
        "id": row[0],
        "kind": row[1],
        "privilege_id": row[2],
        "parent_id": row[3],
        "start_ip": row[4],
        "end_ip": row[5],
        "size": row[6],
        "description": row[7],
        "memo": row[8],
        "color": row[9],
        "cidr": row[10],
        "is_reserved": row[11]
    }


def _fetch_bucket(bucket_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, kind, privilege_id, parent_id, start_ip::TEXT, end_ip::TEXT, size, description, memo, color, cidr, is_reserved, start_int, end_int
        FROM address_buckets
        WHERE id=%s;
    """, (bucket_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Bucket not found")
    return {
        "id": row[0],
        "kind": row[1],
        "privilege_id": row[2],
        "parent_id": row[3],
        "start_ip": row[4],
        "end_ip": row[5],
        "size": row[6],
        "description": row[7],
        "memo": row[8],
        "color": row[9],
        "cidr": row[10],
        "is_reserved": row[11],
        "start_int": row[12],
        "end_int": row[13]
    }


def _determine_privilege_id(start_int: int):
    first_octet = (start_int >> 24) & 0xFF
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, start_int, end_int FROM address_buckets
        WHERE kind='tier0' AND %s BETWEEN start_int AND end_int
        LIMIT 1;
    """, (start_int,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=400, detail=f"No privileged bucket for /8 starting with {first_octet}")
    return row[0], row[1], row[2]


def _ensure_range_within(start_int: int, end_int: int, limit_start: int, limit_end: int, label: str):
    if start_int < limit_start or end_int > limit_end:
        raise HTTPException(status_code=400, detail=f"Range must stay within {label}")


@router.get("/address/buckets/privileged")
def list_privileged_buckets(user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows"))):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, kind, privilege_id, parent_id, start_ip::TEXT, end_ip::TEXT, size, description, memo, color, cidr, is_reserved
        FROM address_buckets
        WHERE kind='tier0'
        ORDER BY start_int;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [_bucket_to_dict(row) for row in rows]


@router.get("/address/buckets/{bucket_id}/children")
def list_bucket_children(
    bucket_id: int,
    user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows"))
):
    bucket = _fetch_bucket(bucket_id)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, kind, privilege_id, parent_id, start_ip::TEXT, end_ip::TEXT, size, description, memo, color, cidr, is_reserved
        FROM address_buckets
        WHERE parent_id=%s
        ORDER BY kind ASC, start_int ASC;
    """, (bucket["id"],))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [_bucket_to_dict(row) for row in rows]


def _bucket_kind_weight(kind: str) -> int:
    if kind == "tier0":
        return 0
    if kind == "parent":
        return 1
    return 2


@router.get("/address/buckets/export")
def export_address_buckets(
    user=Depends(require_roles("editor", "admin"))
):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, kind, privilege_id, parent_id, host(start_ip)::TEXT, host(end_ip)::TEXT, description, memo, color, cidr, is_reserved
        FROM address_buckets
        ORDER BY CASE kind WHEN 'tier0' THEN 0 WHEN 'parent' THEN 1 ELSE 2 END, start_int ASC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    buckets = []
    for row in rows:
        buckets.append({
            "id": row[0],
            "kind": row[1],
            "privilege_id": row[2],
            "parent_id": row[3],
            "start_ip": row[4],
            "end_ip": row[5],
            "description": row[6],
            "memo": row[7],
            "color": row[8],
            "cidr": row[9],
            "is_reserved": row[10]
        })
    return {"buckets": buckets, "count": len(buckets)}


@router.post("/address/buckets/import")
def import_address_buckets(
    payload: AddressBucketBackupPayload,
    user=Depends(require_roles("admin"))
):
    buckets = payload.buckets or []
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("TRUNCATE address_buckets RESTART IDENTITY CASCADE;")
        sorted_buckets = sorted(
            buckets,
            key=lambda b: (_bucket_kind_weight(b.kind), b.id)
        )
        for entry in sorted_buckets:
            start_int = _ip_to_int(entry.start_ip)
            end_int = _ip_to_int(entry.end_ip)
            if start_int > end_int:
                raise HTTPException(status_code=400, detail=f"Invalid range for bucket {entry.id}")
            size = end_int - start_int + 1
            cur.execute("""
                INSERT INTO address_buckets
                    (id, kind, privilege_id, parent_id, start_ip, end_ip, start_int, end_int, size, description, memo, color, cidr, is_reserved, created_at, updated_at)
                VALUES
                    (%s, %s, %s, %s, %s::INET, %s::INET, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW());
            """, (
                entry.id,
                entry.kind,
                entry.privilege_id,
                entry.parent_id,
                entry.start_ip,
                entry.end_ip,
                start_int,
                end_int,
                size,
                entry.description,
                entry.memo,
                entry.color,
                entry.cidr,
                entry.is_reserved or False
            ))
        cur.execute("SELECT setval('address_buckets_id_seq', (SELECT COALESCE(MAX(id), 0) FROM address_buckets));")
        conn.commit()
    except HTTPException:
        conn.rollback()
        cur.close()
        conn.close()
        raise
    except Exception as exc:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Import failed: {exc}")
    cur.close()
    conn.close()
    return {"result": "ok", "imported": len(buckets)}


@router.get("/address/buckets/{bucket_id}")
def get_bucket(
    bucket_id: int,
    user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows"))
):
    bucket = _fetch_bucket(bucket_id)
    return {
        key: bucket[key]
        for key in ("id", "kind", "privilege_id", "parent_id", "start_ip", "end_ip", "size", "description", "memo", "color", "cidr", "is_reserved")
    }


@router.post("/address/buckets/parent")
def create_parent_bucket(
    payload: ParentBucketPayload,
    user=Depends(require_roles("editor", "admin"))
):
    cidr_value = payload.cidr.strip() if payload.cidr else None
    if cidr_value:
        start_ip, end_ip, start_int, end_int, size, canonical_cidr = _range_from_cidr(cidr_value)
    else:
        if not payload.start_ip or not payload.end_ip:
            raise HTTPException(status_code=400, detail="Start and end IP are required when CIDR is not provided")
        start_ip = payload.start_ip
        end_ip = payload.end_ip
        start_int = _ip_to_int(start_ip)
        end_int = _ip_to_int(end_ip)
        if start_int > end_int:
            raise HTTPException(status_code=400, detail="start_ip must be <= end_ip")
        size = end_int - start_int + 1
        canonical_cidr = None
    privilege_id = None
    limit_start = None
    limit_end = None
    parent_id = payload.parent_id
    if parent_id:
        parent_bucket = _fetch_bucket(parent_id)
        if parent_bucket["kind"] not in ("tier0", "parent"):
            raise HTTPException(status_code=400, detail="Parent bucket must be tier0 or parent kind")
        privilege_id = parent_bucket["privilege_id"] or parent_bucket["id"]
        limit_start = parent_bucket["start_int"]
        limit_end = parent_bucket["end_int"]
    else:
        privilege_id, limit_start, limit_end = _determine_privilege_id(start_int)
        parent_id = privilege_id  # attach directly under the privileged /8 bucket
    _ensure_range_within(start_int, end_int, limit_start, limit_end, "/8 range")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO address_buckets
                (kind, privilege_id, parent_id, start_ip, end_ip, start_int, end_int, size, description, memo, color, cidr, is_reserved, created_at, updated_at)
            VALUES
                ('parent', %s, %s, %s::INET, %s::INET, %s, %s, %s, %s, %s, %s, %s, FALSE, NOW(), NOW())
            RETURNING id, kind, privilege_id, parent_id, start_ip::TEXT, end_ip::TEXT, size, description, memo, color, cidr, is_reserved;
        """, (
            privilege_id,
            parent_id,
            start_ip,
            end_ip,
            start_int,
            end_int,
            size,
            payload.description,
            payload.memo,
            payload.color,
            canonical_cidr
        ))
        row = cur.fetchone()
        conn.commit()
    except errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="A parent bucket with the same range already exists")
    finally:
        cur.close()
        conn.close()
    return _bucket_to_dict(row)


@router.post("/address/buckets/child")
def create_child_bucket(
    payload: ChildBucketPayload,
    user=Depends(require_roles("editor", "admin"))
):
    parent_bucket = _fetch_bucket(payload.parent_id)
    if parent_bucket["kind"] != "parent":
        raise HTTPException(status_code=400, detail="Child bucket must belong to a parent bucket")
    cidr_value = payload.cidr.strip() if payload.cidr else None
    if cidr_value:
        start_ip, end_ip, start_int, end_int, size, canonical_cidr = _range_from_cidr(cidr_value)
    else:
        if not payload.start_ip or not payload.end_ip:
            raise HTTPException(status_code=400, detail="Start and end IP are required when CIDR is not provided")
        start_ip = payload.start_ip
        end_ip = payload.end_ip
        start_int = _ip_to_int(start_ip)
        end_int = _ip_to_int(end_ip)
        if start_int > end_int:
            raise HTTPException(status_code=400, detail="start_ip must be <= end_ip")
        size = end_int - start_int + 1
        canonical_cidr = None
    if size > 4096:
        raise HTTPException(status_code=400, detail="Child bucket range must be <= 4096 addresses")
    privilege_id = parent_bucket["privilege_id"]
    _ensure_range_within(start_int, end_int, parent_bucket["start_int"], parent_bucket["end_int"], "parent bucket range")
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO address_buckets
                (kind, privilege_id, parent_id, start_ip, end_ip, start_int, end_int, size, description, memo, color, cidr, is_reserved, created_at, updated_at)
            VALUES
                ('child', %s, %s, %s::INET, %s::INET, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, kind, privilege_id, parent_id, start_ip::TEXT, end_ip::TEXT, size, description, memo, color, cidr, is_reserved;
        """, (
            privilege_id,
            payload.parent_id,
            start_ip,
            end_ip,
            start_int,
            end_int,
            size,
            payload.description,
            payload.memo,
            payload.color,
            canonical_cidr,
            payload.is_reserved
        ))
        row = cur.fetchone()
        conn.commit()
    except errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="A bucket with the same range already exists in this parent")
    finally:
        cur.close()
        conn.close()
    return _bucket_to_dict(row)


@router.patch("/address/buckets/{bucket_id}")
def update_bucket(
    bucket_id: int,
    payload: BucketUpdatePayload,
    user=Depends(require_roles("editor", "admin"))
):
    bucket = _fetch_bucket(bucket_id)
    fields = []
    values = []
    if payload.description is not None:
        fields.append("description = %s")
        values.append(payload.description)
    if payload.memo is not None:
        fields.append("memo = %s")
        values.append(payload.memo)
    if payload.color is not None:
        fields.append("color = %s")
        values.append(payload.color)
    if payload.is_reserved is not None:
        if bucket["kind"] != "child":
            raise HTTPException(status_code=400, detail="Only child buckets can toggle reserved flag")
        fields.append("is_reserved = %s")
        values.append(payload.is_reserved)
    if payload.parent_id is not None:
        if bucket["kind"] != "parent":
            raise HTTPException(status_code=400, detail="Only parent buckets can change parent")
        new_parent = _fetch_bucket(payload.parent_id)
        if new_parent["kind"] not in ("tier0", "parent"):
            raise HTTPException(status_code=400, detail="New parent must be tier0 or parent kind")
        _ensure_range_within(bucket["start_int"], bucket["end_int"],
                             new_parent["start_int"], new_parent["end_int"],
                             "new parent range")
        fields.append("parent_id = %s")
        values.append(payload.parent_id)
    if not fields:
        raise HTTPException(status_code=400, detail="No updatable fields supplied")
    values.append(bucket_id)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f"""
        UPDATE address_buckets
        SET {", ".join(fields)}, updated_at=NOW()
        WHERE id=%s
        RETURNING id, kind, privilege_id, parent_id, start_ip::TEXT, end_ip::TEXT, size, description, memo, color, cidr, is_reserved;
    """, tuple(values))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return _bucket_to_dict(row)


@router.delete("/address/buckets/{bucket_id}")
def delete_bucket(
    bucket_id: int,
    user=Depends(require_roles("editor", "admin"))
):
    bucket = _fetch_bucket(bucket_id)
    if bucket["kind"] == "tier0":
        raise HTTPException(status_code=400, detail="Cannot delete privileged buckets")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM address_buckets WHERE id=%s RETURNING id;", (bucket_id,))
    row = cur.fetchone()
    if not row:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Bucket not found")
    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "deleted": True}
