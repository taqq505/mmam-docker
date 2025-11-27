import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from app.db import get_db_connection
from app import nmos_client, settings_store
from app.auth import require_roles, decode_token
import uuid
from datetime import datetime
from typing import List

# --------------------------------------------------------
# Define router instance
# ルータインスタンスを定義
# --------------------------------------------------------
router = APIRouter()

TEXT_FILTER_FIELDS = {
    "flow_id", "display_name",
    "source_addr_a", "multicast_addr_a",
    "source_addr_b", "multicast_addr_b",
    "transport_protocol",
    "nmos_node_id",
    "nmos_flow_id", "nmos_sender_id", "nmos_device_id",
    "nmos_is04_host", "nmos_is05_host",
    "sdp_url", "sdp_cache",
    "nmos_label", "nmos_description", "management_url",
    "media_type", "st2110_format", "redundancy_group",
    "alias1", "alias2", "alias3", "alias4",
    "alias5", "alias6", "alias7", "alias8",
    "flow_status", "availability", "data_source",
    "rds_address", "rds_api_url",
    "user_field1", "user_field2", "user_field3", "user_field4",
    "user_field5", "user_field6", "user_field7", "user_field8",
    "note",
    "nmos_is04_version", "nmos_is05_version",
    "nmos_is04_base_url", "nmos_is05_base_url"
}

INT_FILTER_FIELDS = {
    "source_port_a", "group_port_a",
    "source_port_b", "group_port_b",
    "nmos_is04_port", "nmos_is05_port",
    "group_port_a", "group_port_b"
}

FILTER_FIELDS = TEXT_FILTER_FIELDS | INT_FILTER_FIELDS

KEYWORD_SEARCH_FIELDS = [
    "flow_id", "nmos_node_id", "nmos_flow_id", "nmos_sender_id", "nmos_device_id",
    "display_name",
    "source_addr_a", "source_addr_b",
    "multicast_addr_a", "multicast_addr_b",
    "transport_protocol",
    "nmos_label", "nmos_description",
    "alias1", "alias2", "alias3", "alias4",
    "alias5", "alias6", "alias7", "alias8",
    "management_url", "note",
    "media_type", "redundancy_group"
]

UUID_LIKE_FIELDS = {"flow_id", "nmos_node_id", "nmos_flow_id", "nmos_sender_id", "nmos_device_id"}
LOCK_ROLE_SETTING_KEY = "flow_lock_role"

COLLISION_FIELDS = [
    ("multicast_addr_a", "Multicast Address A"),
    ("multicast_addr_b", "Multicast Address B")
]

FLOW_DB_COLUMNS = [
    "flow_id", "display_name",
    "source_addr_a", "source_port_a", "multicast_addr_a", "group_port_a",
    "source_addr_b", "source_port_b", "multicast_addr_b", "group_port_b",
    "transport_protocol",
    "nmos_node_id", "nmos_node_label", "nmos_node_description",
    "nmos_flow_id", "nmos_sender_id", "nmos_device_id",
    "nmos_is04_host", "nmos_is04_port", "nmos_is04_base_url",
    "nmos_is05_host", "nmos_is05_port", "nmos_is05_base_url",
    "nmos_is04_version", "nmos_is05_version",
    "sdp_url", "sdp_cache",
    "nmos_label", "nmos_description", "management_url",
    "media_type", "st2110_format", "redundancy_group",
    "alias1", "alias2", "alias3", "alias4", "alias5", "alias6", "alias7", "alias8",
    "flow_status", "availability", "last_seen",
    "data_source", "rds_address", "rds_api_url",
    "user_field1", "user_field2", "user_field3", "user_field4",
    "user_field5", "user_field6", "user_field7", "user_field8",
    "note", "locked"
]

FLOW_INSERT_COLUMNS_SQL = ", ".join(FLOW_DB_COLUMNS)
FLOW_INSERT_PLACEHOLDERS_SQL = ", ".join(["%s"] * len(FLOW_DB_COLUMNS))
FLOW_UPDATE_ASSIGNMENTS = ", ".join([f"{col} = EXCLUDED.{col}" for col in FLOW_DB_COLUMNS if col != "flow_id"])
FLOW_UPSERT_SQL = f"""
    INSERT INTO flows ({FLOW_INSERT_COLUMNS_SQL})
    VALUES ({FLOW_INSERT_PLACEHOLDERS_SQL})
    ON CONFLICT (flow_id) DO UPDATE SET
        {FLOW_UPDATE_ASSIGNMENTS},
        updated_at = NOW();
"""


def _parse_datetime(value: str, label: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid datetime for {label}. Use ISO format (YYYY-MM-DDTHH:MM:SS)."
        )

# --------------------------------------------------------
# Pydantic model for flow entries
# フロー情報用Pydanticモデル
# --------------------------------------------------------
class Flow(BaseModel):
    flow_id: str | None = None
    display_name: str | None = None
    source_addr_a: str | None = None
    source_port_a: int | None = None
    multicast_addr_a: str | None = None
    group_port_a: int | None = None
    source_addr_b: str | None = None
    source_port_b: int | None = None
    multicast_addr_b: str | None = None
    group_port_b: int | None = None
    transport_protocol: str | None = "RTP/UDP"
    nmos_node_id: str | None = None
    nmos_node_label: str | None = None
    nmos_node_description: str | None = None
    nmos_flow_id: str | None = None
    nmos_sender_id: str | None = None
    nmos_device_id: str | None = None
    nmos_is04_host: str | None = None
    nmos_is04_port: int | None = None
    nmos_is04_base_url: str | None = None
    nmos_is05_host: str | None = None
    nmos_is05_port: int | None = None
    nmos_is05_base_url: str | None = None
    nmos_is04_version: str | None = None
    nmos_is05_version: str | None = None
    sdp_url: str | None = None
    sdp_cache: str | None = None
    nmos_label: str | None = None
    nmos_description: str | None = None
    management_url: str | None = None
    media_type: str | None = None
    st2110_format: str | None = None
    redundancy_group: str | None = None
    alias1: str | None = None
    alias2: str | None = None
    alias3: str | None = None
    alias4: str | None = None
    alias5: str | None = None
    alias6: str | None = None
    alias7: str | None = None
    alias8: str | None = None
    flow_status: str | None = "active"
    availability: str | None = "available"
    last_seen: str | None = None
    data_source: str | None = "manual"
    rds_address: str | None = None
    rds_api_url: str | None = None
    user_field1: str | None = None
    user_field2: str | None = None
    user_field3: str | None = None
    user_field4: str | None = None
    user_field5: str | None = None
    user_field6: str | None = None
    user_field7: str | None = None
    user_field8: str | None = None
    note: str | None = None
    locked: bool | None = False


class FlowUpdate(BaseModel):
    display_name: str | None = None
    source_addr_a: str | None = None
    source_port_a: int | None = None
    multicast_addr_a: str | None = None
    group_port_a: int | None = None
    source_addr_b: str | None = None
    source_port_b: int | None = None
    multicast_addr_b: str | None = None
    group_port_b: int | None = None
    transport_protocol: str | None = None
    nmos_node_id: str | None = None
    nmos_node_label: str | None = None
    nmos_node_description: str | None = None
    nmos_flow_id: str | None = None
    nmos_sender_id: str | None = None
    nmos_device_id: str | None = None
    nmos_is04_host: str | None = None
    nmos_is04_port: int | None = None
    nmos_is04_base_url: str | None = None
    nmos_is05_host: str | None = None
    nmos_is05_port: int | None = None
    nmos_is05_base_url: str | None = None
    nmos_is04_version: str | None = None
    nmos_is05_version: str | None = None
    sdp_url: str | None = None
    sdp_cache: str | None = None
    nmos_label: str | None = None
    nmos_description: str | None = None
    management_url: str | None = None
    media_type: str | None = None
    st2110_format: str | None = None
    redundancy_group: str | None = None
    alias1: str | None = None
    alias2: str | None = None
    alias3: str | None = None
    alias4: str | None = None
    alias5: str | None = None
    alias6: str | None = None
    alias7: str | None = None
    alias8: str | None = None
    flow_status: str | None = None
    availability: str | None = None
    last_seen: str | None = None
    data_source: str | None = None
    rds_address: str | None = None
    rds_api_url: str | None = None
    user_field1: str | None = None
    user_field2: str | None = None
    user_field3: str | None = None
    user_field4: str | None = None
    user_field5: str | None = None
    user_field6: str | None = None
    user_field7: str | None = None
    user_field8: str | None = None
    note: str | None = None
    locked: bool | None = None


def _build_flow_values(flow_id: str, flow: Flow):
    return [
        flow_id, flow.display_name,
        flow.source_addr_a, flow.source_port_a, flow.multicast_addr_a, flow.group_port_a,
        flow.source_addr_b, flow.source_port_b, flow.multicast_addr_b, flow.group_port_b,
        flow.transport_protocol,
        flow.nmos_node_id, flow.nmos_node_label, flow.nmos_node_description,
        flow.nmos_flow_id, flow.nmos_sender_id, flow.nmos_device_id,
        flow.nmos_is04_host, flow.nmos_is04_port, flow.nmos_is04_base_url,
        flow.nmos_is05_host, flow.nmos_is05_port, flow.nmos_is05_base_url,
        flow.nmos_is04_version, flow.nmos_is05_version,
        flow.sdp_url, flow.sdp_cache,
        flow.nmos_label, flow.nmos_description, flow.management_url,
        flow.media_type, flow.st2110_format, flow.redundancy_group,
        flow.alias1, flow.alias2, flow.alias3, flow.alias4,
        flow.alias5, flow.alias6, flow.alias7, flow.alias8,
        flow.flow_status, flow.availability, flow.last_seen,
        flow.data_source, flow.rds_address, flow.rds_api_url,
        flow.user_field1, flow.user_field2, flow.user_field3, flow.user_field4,
        flow.user_field5, flow.user_field6, flow.user_field7, flow.user_field8,
        flow.note, bool(flow.locked)
    ]


def _upsert_flow(cur, flow_id: str, flow: Flow):
    values = _build_flow_values(flow_id, flow)
    cur.execute(FLOW_UPSERT_SQL, values)


NMOS_SYNC_FIELDS = [
    "display_name",
    "nmos_label", "nmos_description",
    "nmos_node_label", "nmos_node_description",
    "nmos_node_id", "nmos_device_id", "nmos_sender_id", "nmos_flow_id",
    "nmos_is04_host", "nmos_is04_port", "nmos_is04_base_url",
    "nmos_is05_host", "nmos_is05_port", "nmos_is05_base_url",
    "nmos_is04_version", "nmos_is05_version",
    "source_addr_a", "source_port_a", "multicast_addr_a", "group_port_a",
    "source_addr_b", "source_port_b", "multicast_addr_b", "group_port_b",
    "media_type", "st2110_format", "redundancy_group",
    "transport_protocol",
    "sdp_url", "sdp_cache"
]


def _fetch_flow_record(flow_id: str) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM flows WHERE flow_id = %s;", (flow_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Flow not found")
    colnames = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()
    return dict(zip(colnames, row))


def _fetch_all_flows() -> list[dict]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM flows ORDER BY updated_at DESC;")
    rows = cur.fetchall()
    colnames = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()
    return [dict(zip(colnames, row)) for row in rows]


def _resolve_nmos_bases(flow: dict):
    raw_is04_host = flow.get("nmos_is04_host")
    raw_is05_host = flow.get("nmos_is05_host")
    is04_base = flow.get("nmos_is04_base_url")
    is05_base = flow.get("nmos_is05_base_url")
    if not is04_base:
        if raw_is04_host and raw_is04_host.strip().lower().startswith(("http://", "https://")):
            is04_base = nmos_client.normalize_base_url(raw_is04_host)
        else:
            is04_base = nmos_client.build_base_from_host_port(raw_is04_host, flow.get("nmos_is04_port"))
    if not is05_base:
        if raw_is05_host and raw_is05_host.strip().lower().startswith(("http://", "https://")):
            is05_base = nmos_client.normalize_base_url(raw_is05_host)
        else:
            is05_base = nmos_client.build_base_from_host_port(raw_is05_host, flow.get("nmos_is05_port"))
    nmos_flow_id = flow.get("nmos_flow_id") or flow.get("flow_id")
    sender_id = flow.get("nmos_sender_id")
    is04_version = flow.get("nmos_is04_version") or nmos_client.DEFAULT_IS04_VERSION
    is05_version = flow.get("nmos_is05_version") or nmos_client.DEFAULT_IS05_VERSION
    if not is04_base or not is05_base or not nmos_flow_id:
        raise HTTPException(status_code=400, detail="Flow does not contain NMOS host information")
    return is04_base, is05_base, nmos_flow_id, sender_id, is04_version, is05_version


def _fetch_nmos_snapshot(flow: dict, timeout: int = 5):
    is04_base, is05_base, nmos_flow_id, sender_id, is04_version, is05_version = _resolve_nmos_bases(flow)
    return nmos_client.fetch_flow_snapshot(
        flow_id=nmos_flow_id,
        is04_base_url=is04_base,
        is05_base_url=is05_base,
        sender_id=sender_id,
        timeout=timeout,
        is04_version=is04_version,
        is05_version=is05_version
    )


def _diff_flow_fields(current: dict, snapshot: dict):
    differences = {}
    for field in NMOS_SYNC_FIELDS:
        if field not in snapshot:
            continue
        if current.get(field) != snapshot.get(field):
            differences[field] = {
                "current": current.get(field),
                "nmos": snapshot.get(field)
            }
    return differences


def _lock_allowed_roles() -> set[str]:
    try:
        role = settings_store.get_setting(LOCK_ROLE_SETTING_KEY)
    except KeyError:
        role = "admin"
    if role == "editor":
        return {"editor", "admin"}
    return {"admin"}


def _user_can_toggle_lock(user: dict | None) -> bool:
    if not user:
        return False
    return user.get("role") in _lock_allowed_roles()


def _ensure_flow_unlocked(flow: dict):
    if flow.get("locked"):
        raise HTTPException(status_code=423, detail="Flow is locked and cannot be modified")


class FlowLockUpdate(BaseModel):
    locked: bool


class NmosApplyRequest(BaseModel):
    fields: list[str]
    timeout: int | None = None


# --------------------------------------------------------
# GET /api/flows
# Return flow list (with optional filter)
# フロー一覧を返す（削除済みを除外／含む切替可能）
# --------------------------------------------------------
@router.get("/flows")
def list_flows(
    request: Request,
    user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows")),
    include_unused: bool = Query(False, description="Include logically deleted flows / 論理削除済みも含める"),
    fields: str | None = Query(None, description="Comma-separated list of extra fields to include / 追加取得したいフィールド"),
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    sort_by: str = Query("updated_at", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order (asc or desc)"),
    updated_at_min: str | None = Query(None, description="Return flows updated at or after this ISO timestamp"),
    updated_at_max: str | None = Query(None, description="Return flows updated at or before this ISO timestamp"),
    created_at_min: str | None = Query(None, description="Return flows created at or after this ISO timestamp"),
    created_at_max: str | None = Query(None, description="Return flows created at or before this ISO timestamp"),
    q: str | None = Query(None, description="Keyword search across text fields / 全テキストフィールド横断検索")
):
    """
    List flow entries (default + optional fields via ?fields=)
    一覧を返す（デフォルト項目に ?fields= で指定したカラムを追加可能）
    """

    # ✅ デフォルト項目
    base_fields = [
        "flow_id", "display_name", "nmos_node_label",
        "flow_status", "availability", "locked",
        "created_at", "updated_at"
    ]

    # ✅ 追加フィールドを処理（カンマ区切り→トリム→重複除去）
    extra_fields = []
    if fields:
        for f in fields.split(","):
            f = f.strip()
            if f and f not in base_fields:
                extra_fields.append(f)

    all_fields = base_fields + extra_fields
    field_sql = ", ".join(all_fields)

    # ✅ SQL組み立て
    base_query = f"SELECT {field_sql} FROM flows"
    conditions = []
    values = []

    if not include_unused:
        conditions.append("flow_status = 'active'")

    # ✅ 動的検索条件
    skip_keys = {
        "include_unused", "fields",
        "updated_at_min", "updated_at_max",
        "created_at_min", "created_at_max",
        "q"
    }
    filters = {}
    for key, value in request.query_params.multi_items():
        if key in skip_keys:
            continue
        if key not in FILTER_FIELDS:
            continue
        if value == "":
            continue
        filters.setdefault(key, []).append(value)

    for key, vals in filters.items():
        clauses = []
        for val in vals:
            if key in TEXT_FILTER_FIELDS:
                if key in UUID_LIKE_FIELDS:
                    clauses.append(f"CAST({key} AS TEXT) = %s")
                    values.append(val)
                else:
                    clauses.append(f"{key} ILIKE %s")
                    values.append(f"%{val}%")
            elif key in INT_FILTER_FIELDS:
                try:
                    int_val = int(val)
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Invalid integer for {key}")
                clauses.append(f"{key} = %s")
                values.append(int_val)
        if clauses:
            if len(clauses) == 1:
                conditions.append(clauses[0])
            else:
                grouped = " OR ".join(clauses)
                conditions.append(f"({grouped})")

    if updated_at_min:
        dt = _parse_datetime(updated_at_min, "updated_at_min")
        conditions.append("updated_at >= %s")
        values.append(dt)
    if updated_at_max:
        dt = _parse_datetime(updated_at_max, "updated_at_max")
        conditions.append("updated_at <= %s")
        values.append(dt)
    if created_at_min:
        dt = _parse_datetime(created_at_min, "created_at_min")
        conditions.append("created_at >= %s")
        values.append(dt)
    if created_at_max:
        dt = _parse_datetime(created_at_max, "created_at_max")
        conditions.append("created_at <= %s")
        values.append(dt)

    # Numeric range filters
    for field in INT_FILTER_FIELDS:
        min_key = f"{field}_min"
        max_key = f"{field}_max"
        min_val = request.query_params.get(min_key)
        max_val = request.query_params.get(max_key)
        if min_val not in (None, ""):
            try:
                values.append(int(min_val))
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid integer for {min_key}")
            conditions.append(f"{field} >= %s")
        if max_val not in (None, ""):
            try:
                values.append(int(max_val))
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid integer for {max_key}")
            conditions.append(f"{field} <= %s")

    if q:
        keyword = f"%{q}%"
        clauses = []
        for field in KEYWORD_SEARCH_FIELDS:
            if field in UUID_LIKE_FIELDS:
                clauses.append(f"CAST({field} AS TEXT) ILIKE %s")
            else:
                clauses.append(f"{field} ILIKE %s")
        conditions.append("(" + " OR ".join(clauses) + ")")
        values.extend([keyword] * len(clauses))

    if conditions:
        where_clause = " WHERE " + " AND ".join(conditions)
    else:
        where_clause = ""

    sort_field = sort_by if sort_by in all_fields else "updated_at"
    order_clause = "ASC" if sort_order.lower() == "asc" else "DESC"
    query = f"{base_query}{where_clause} ORDER BY {sort_field} {order_clause} LIMIT %s OFFSET %s;"

    conn = get_db_connection()
    cur = conn.cursor()
    params = list(values) + [limit, offset]
    cur.execute(query, tuple(params))
    rows = cur.fetchall()
    colnames = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()

    # ✅ レスポンスをdict化
    return [dict(zip(colnames, row)) for row in rows]


@router.get("/flows/summary")
def flow_summary(
    user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows"))
):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE flow_status = 'active') AS active
        FROM flows;
    """)
    row = cur.fetchone()
    cur.close()
    conn.close()

    total = row[0] if row else 0
    active = row[1] if row else 0
    return {"total": total, "active": active}


@router.get("/flows/export")
def export_flows(user=Depends(require_roles("admin"))):
    flows = _fetch_all_flows()
    filename = f"mmam_flows_{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    pretty = json.dumps(jsonable_encoder(flows), ensure_ascii=False, indent=2)
    return Response(content=pretty, headers=headers, media_type="application/json")


@router.post("/flows/import")
def import_flows(payload: List[Flow], user=Depends(require_roles("admin"))):
    if not payload:
        return {"result": "ok", "inserted": 0, "updated": 0, "skipped_locked": 0}

    conn = get_db_connection()
    cur = conn.cursor()
    inserted = 0
    updated = 0
    skipped_locked = 0
    try:
        for flow in payload:
            flow_id = flow.flow_id or flow.nmos_flow_id or str(uuid.uuid4())
            cur.execute("SELECT locked FROM flows WHERE flow_id=%s;", (flow_id,))
            existing_row = cur.fetchone()
            if existing_row:
                if existing_row[0]:
                    skipped_locked += 1
                    continue
                is_update = True
            else:
                is_update = False

            _upsert_flow(cur, flow_id, flow)
            if is_update:
                updated += 1
            else:
                inserted += 1
        conn.commit()
    finally:
        cur.close()
        conn.close()

    return {
        "result": "ok",
        "inserted": inserted,
        "updated": updated,
        "skipped_locked": skipped_locked
    }


@router.get("/checker/collisions")
def collision_checker(user=Depends(require_roles("editor", "admin"))):
    conn = get_db_connection()
    cur = conn.cursor()
    results = []
    try:
        for field, label in COLLISION_FIELDS:
            cur.execute(
                f"""
                SELECT f.{field}, COUNT(*) AS cnt,
                       json_agg(json_build_object(
                           'flow_id', f.flow_id,
                           'display_name', f.display_name,
                           'nmos_node_label', COALESCE(f.nmos_node_label, '')
                       ) ORDER BY f.flow_id) AS flows
                FROM flows f
                WHERE f.{field} IS NOT NULL
                GROUP BY f.{field}
                HAVING COUNT(*) > 1
                ORDER BY cnt DESC;
                """
            )
            rows = cur.fetchall()
            entries = []
            for value, count, json_flows in rows:
                entries.append({
                    "value": str(value),
                    "count": count,
                    "flows": json_flows
                })
            results.append({
                "field": field,
                "label": label,
                "entries": entries
            })
    finally:
        cur.close()
        conn.close()

    return {"results": results}


@router.get("/flows/{flow_id}")
def get_flow_detail(
    flow_id: str,
    user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows"))
):
    flow = _fetch_flow_record(flow_id)
    flow["lock_toggle_allowed"] = _user_can_toggle_lock(user)
    return flow


@router.get("/flows/{flow_id}/nmos/check")
def check_flow_against_nmos(
    flow_id: str,
    timeout: int = 5,
    user=Depends(require_roles("viewer", "editor", "admin", allow_anonymous_setting="allow_anonymous_flows"))
):
    flow = _fetch_flow_record(flow_id)
    snapshot = _fetch_nmos_snapshot(flow, timeout=timeout)
    differences = _diff_flow_fields(flow, snapshot)
    return {
        "flow_id": flow_id,
        "nmos_flow_id": snapshot.get("nmos_flow_id"),
        "snapshot": snapshot,
        "differences": differences,
        "comparable_fields": [field for field in NMOS_SYNC_FIELDS if field in snapshot]
    }


@router.post("/flows/{flow_id}/nmos/apply")
def apply_nmos_updates(
    flow_id: str,
    payload: NmosApplyRequest,
    user=Depends(require_roles("editor", "admin"))
):
    if not payload.fields:
        raise HTTPException(status_code=400, detail="No fields selected for NMOS apply")
    flow = _fetch_flow_record(flow_id)
    _ensure_flow_unlocked(flow)
    snapshot = _fetch_nmos_snapshot(flow, timeout=payload.timeout or 5)
    updates = {}
    for field in payload.fields:
        if field in NMOS_SYNC_FIELDS and field in snapshot:
            updates[field] = snapshot.get(field)
    if not updates:
        raise HTTPException(status_code=400, detail="No matching fields found in NMOS data")

    set_clause = ", ".join([f"{key} = %s" for key in updates])
    values = list(updates.values())
    values.append(flow_id)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE flows SET {set_clause}, updated_at = NOW() WHERE flow_id = %s;",
        values
    )
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Flow not found")
    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "flow_id": flow_id, "updated_fields": list(updates.keys())}


@router.post("/flows/{flow_id}/lock")
def set_flow_lock(
    flow_id: str,
    payload: FlowLockUpdate,
    user=Depends(decode_token)
):
    if not _user_can_toggle_lock(user):
        raise HTTPException(status_code=403, detail="Not allowed to change lock status")
    flow = _fetch_flow_record(flow_id)
    new_state = bool(payload.locked)
    if flow.get("locked") == new_state:
        return {"result": "ok", "flow_id": flow_id, "locked": new_state}

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE flows
        SET locked = %s, updated_at = NOW()
        WHERE flow_id = %s;
        """,
        (new_state, flow_id)
    )
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Flow not found")
    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "flow_id": flow_id, "locked": new_state}


@router.patch("/flows/{flow_id}")
def update_flow(
    flow_id: str,
    payload: FlowUpdate,
    user=Depends(require_roles("editor", "admin"))
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    current = _fetch_flow_record(flow_id)
    lock_change = "locked" in updates
    if lock_change and not _user_can_toggle_lock(user):
        raise HTTPException(status_code=403, detail="Not allowed to change lock status")

    non_lock_updates = {k: v for k, v in updates.items() if k != "locked"}
    if current.get("locked") and non_lock_updates:
        raise HTTPException(status_code=423, detail="Flow is locked. Unlock before editing.")

    if lock_change and updates["locked"] == current.get("locked"):
        updates.pop("locked")
        lock_change = False
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join([f"{key} = %s" for key in updates.keys()])
    values = list(updates.values())
    values.append(flow_id)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE flows SET {set_clause}, updated_at = NOW() WHERE flow_id = %s;",
        values
    )
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Flow not found")

    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "flow_id": flow_id, "updated_fields": list(updates.keys())}



# --------------------------------------------------------
# POST /api/flows
# Create a new flow entry
# 新しいフローエントリを作成
# --------------------------------------------------------
@router.post("/flows")
def create_flow(flow: Flow, user=Depends(require_roles("editor", "admin"))):
    flow_id = flow.flow_id or flow.nmos_flow_id or str(uuid.uuid4())

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT flow_status FROM flows WHERE flow_id=%s;", (flow_id,))
    existing = cur.fetchone()
    if existing and existing[0] != "unused":
        cur.close()
        conn.close()
        raise HTTPException(status_code=409, detail="Flow ID already exists")
    try:
        _upsert_flow(cur, flow_id, flow)
        conn.commit()
    finally:
        cur.close()
        conn.close()

    return {"result": "ok", "flow_id": flow_id}


# --------------------------------------------------------
# DELETE /api/flows/{flow_id}
# Logical delete (mark as unused)
# 論理削除（使用停止フラグ付与）
# --------------------------------------------------------
@router.delete("/flows/{flow_id}")
def delete_flow(flow_id: str, user=Depends(require_roles("admin"))):
    flow = _fetch_flow_record(flow_id)
    _ensure_flow_unlocked(flow)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE flows
        SET flow_status='unused', availability='lost', updated_at=NOW()
        WHERE flow_id=%s;
    """, (flow_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Flow not found / 該当フローなし")
    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "flow_id": flow_id, "deleted": True}


@router.delete("/flows/{flow_id}/hard")
def hard_delete_flow(flow_id: str, user=Depends(require_roles("admin"))):
    """
    Permanently remove a flow record from the database.
    フローの行を完全削除する危険操作（管理者のみ）。
    """
    flow = _fetch_flow_record(flow_id)
    _ensure_flow_unlocked(flow)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM flows WHERE flow_id=%s;", (flow_id,))
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Flow not found / 該当フローなし")
    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "flow_id": flow_id, "hard_deleted": True}
