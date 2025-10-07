# MMAM: Media Multicast Address Manager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel
import psycopg2
import bcrypt
import jwt
import datetime
import os
import uuid

from db_init import init_db  # Ensure db_init.py is in the same folder

app = FastAPI(title="MMAM API")

# Initialize DB on startup
init_db()

# --------------------------------------------------------
# JWT / DB settings
# --------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
ALGORITHM = "HS256"

DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "mmam")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "secret")
DB_NAME = os.getenv("POSTGRES_DB", "mmam")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def get_db_connection():
    """Create new DB connection."""
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASS,
        dbname=DB_NAME
    )


# --------------------------------------------------------
# User functions
# --------------------------------------------------------
def get_user(username: str):
    """Fetch user from DB."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT username, password_hash, role FROM users WHERE username=%s", (username,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return {"username": row[0], "password_hash": row[1], "role": row[2]}
    return None


# --------------------------------------------------------
# Auth endpoints
# --------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMAM"}


@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user(form_data.username)
    if not user or not bcrypt.checkpw(form_data.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    payload = {
        "sub": user["username"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/me")
def me(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"username": payload["sub"], "role": payload["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --------------------------------------------------------
# Flow schema (full version, all fields optional)
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


def get_current_user(token: str = Depends(oauth2_scheme)):
    """Decode JWT token and return user info."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"username": payload["sub"], "role": payload["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --------------------------------------------------------
# /api/flows endpoints
# --------------------------------------------------------
@app.get("/api/flows")
def list_flows(user=Depends(get_current_user)):
    """Return all flows."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT flow_id, display_name, flow_status, availability, created_at, updated_at
        FROM flows
        ORDER BY updated_at DESC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "flow_id": str(r[0]),
            "display_name": r[1],
            "flow_status": r[2],
            "availability": r[3],
            "created_at": r[4],
            "updated_at": r[5]
        }
        for r in rows
    ]


@app.post("/api/flows")
def create_flow(flow: Flow, user=Depends(get_current_user)):
    """Create a new flow entry (any subset of fields allowed)."""
    flow_id = flow.flow_id or flow.nmos_flow_id or str(uuid.uuid4())

    conn = get_db_connection()
    cur = conn.cursor()
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
            user_field1, user_field2, user_field3, user_field4, user_field5, user_field6, user_field7, user_field8,
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
            %s, %s, %s, %s, %s, %s, %s, %s,
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
        flow.alias1, flow.alias2, flow.alias3, flow.alias4, flow.alias5, flow.alias6, flow.alias7, flow.alias8,
        flow.flow_status, flow.availability, flow.last_seen,
        flow.data_source, flow.rds_address, flow.rds_api_url,
        flow.user_field1, flow.user_field2, flow.user_field3, flow.user_field4, flow.user_field5, flow.user_field6, flow.user_field7, flow.user_field8,
        flow.note
    ))
    conn.commit()
    cur.close()
    conn.close()

    return {"result": "ok", "flow_id": flow_id}

# --------------------------------------------------------
# /api/flows/{id} endpoints
# --------------------------------------------------------

@app.get("/api/flows/{flow_id}")
def get_flow(flow_id: str, user=Depends(get_current_user)):
    """Get detailed flow information."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM flows WHERE flow_id = %s;", (flow_id,))
    row = cur.fetchone()
    colnames = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Flow not found")

    return dict(zip(colnames, row))


@app.patch("/api/flows/{flow_id}")
def patch_flow(flow_id: str, updates: dict, user=Depends(get_current_user)):
    """Partially update flow fields."""
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided")

    # Protect immutable fields
    for field in ["id", "flow_id", "created_at"]:
        if field in updates:
            updates.pop(field, None)

    set_clause = ", ".join([f"{key} = %s" for key in updates.keys()])
    values = list(updates.values())
    values.append(flow_id)

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(f"UPDATE flows SET {set_clause}, updated_at = NOW() WHERE flow_id = %s;", values)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Flow not found")
        conn.commit()
    finally:
        cur.close()
        conn.close()

    return {
        "result": "ok",
        "flow_id": flow_id,
        "updated_fields": list(updates.keys())
    }


@app.delete("/api/flows/{flow_id}")
def delete_flow(flow_id: str, user=Depends(get_current_user)):
    """
    Logical delete of a flow.
    Instead of removing the row, sets flow_status='unused' and availability='lost'.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE flows
        SET flow_status = 'unused',
            availability = 'lost',
            updated_at = NOW()
        WHERE flow_id = %s;
    """, (flow_id,))
    affected = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()

    if affected == 0:
        raise HTTPException(status_code=404, detail="Flow not found")

    return {"result": "ok", "flow_id": flow_id, "deleted": True}
