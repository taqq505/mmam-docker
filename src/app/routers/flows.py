from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.db import get_db_connection
from app.auth import decode_token
import uuid

# --------------------------------------------------------
# Define router instance
# ルータインスタンスを定義
# --------------------------------------------------------
router = APIRouter()

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
    nmos_flow_id: str | None = None
    nmos_sender_id: str | None = None
    nmos_device_id: str | None = None
    nmos_is04_host: str | None = None
    nmos_is04_port: int | None = None
    nmos_is05_host: str | None = None
    nmos_is05_port: int | None = None
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


# --------------------------------------------------------
# GET /api/flows
# Return flow list (with optional filter)
# フロー一覧を返す（削除済みを除外／含む切替可能）
# --------------------------------------------------------
@router.get("/flows")
def list_flows(
    user=Depends(decode_token),
    include_unused: bool = Query(False, description="Include logically deleted flows / 論理削除済みも含める"),
    fields: str | None = Query(None, description="Comma-separated list of extra fields to include / 追加取得したいフィールド")
):
    """
    List flow entries (default + optional fields via ?fields=)
    一覧を返す（デフォルト項目に ?fields= で指定したカラムを追加可能）
    """

    # ✅ デフォルト項目
    base_fields = [
        "flow_id", "display_name", "flow_status",
        "availability", "created_at", "updated_at"
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
    if include_unused:
        query = f"{base_query} ORDER BY updated_at DESC;"
    else:
        query = f"{base_query} WHERE flow_status = 'active' ORDER BY updated_at DESC;"

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(query)
    rows = cur.fetchall()
    colnames = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()

    # ✅ レスポンスをdict化
    return [dict(zip(colnames, row)) for row in rows]



# --------------------------------------------------------
# POST /api/flows
# Create a new flow entry
# 新しいフローエントリを作成
# --------------------------------------------------------
@router.post("/flows")
def create_flow(flow: Flow, user=Depends(decode_token)):
    flow_id = flow.flow_id or flow.nmos_flow_id or str(uuid.uuid4())

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO flows (
                flow_id, display_name,
                source_addr_a, source_port_a, multicast_addr_a, group_port_a,
                source_addr_b, source_port_b, multicast_addr_b, group_port_b,
                transport_protocol,
                nmos_flow_id, nmos_sender_id, nmos_device_id,
                nmos_is04_host, nmos_is04_port, nmos_is05_host, nmos_is05_port,
                sdp_url, sdp_cache,
                nmos_label, nmos_description, management_url,
                media_type, st2110_format, redundancy_group,
                alias1, alias2, alias3, alias4, alias5, alias6, alias7, alias8,
                flow_status, availability, last_seen,
                data_source, rds_address, rds_api_url,
                user_field1, user_field2, user_field3, user_field4,
                user_field5, user_field6, user_field7, user_field8,
                note
            )
            VALUES (
                %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s
            )
            ON CONFLICT (flow_id) DO NOTHING;
        """, (
            flow_id, flow.display_name,
            flow.source_addr_a, flow.source_port_a, flow.multicast_addr_a, flow.group_port_a,
            flow.source_addr_b, flow.source_port_b, flow.multicast_addr_b, flow.group_port_b,
            flow.transport_protocol,
            flow.nmos_flow_id, flow.nmos_sender_id, flow.nmos_device_id,
            flow.nmos_is04_host, flow.nmos_is04_port, flow.nmos_is05_host, flow.nmos_is05_port,
            flow.sdp_url, flow.sdp_cache,
            flow.nmos_label, flow.nmos_description, flow.management_url,
            flow.media_type, flow.st2110_format, flow.redundancy_group,
            flow.alias1, flow.alias2, flow.alias3, flow.alias4,
            flow.alias5, flow.alias6, flow.alias7, flow.alias8,
            flow.flow_status, flow.availability, flow.last_seen,
            flow.data_source, flow.rds_address, flow.rds_api_url,
            flow.user_field1, flow.user_field2, flow.user_field3, flow.user_field4,
            flow.user_field5, flow.user_field6, flow.user_field7, flow.user_field8,
            flow.note
        ))
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
def delete_flow(flow_id: str, user=Depends(decode_token)):
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
