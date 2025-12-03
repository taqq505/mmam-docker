import os
import psycopg2
import time
import bcrypt
import uuid
from ipaddress import ip_address

# Database connection settings
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "mmam")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "secret")
DB_NAME = os.getenv("POSTGRES_DB", "mmam")

# Create initial admin user (can be disabled via ENV)
INIT_ADMIN = os.getenv("INIT_ADMIN", "true").lower() == "true"

# Application setting defaults (key/value)
SETTINGS_DEFAULTS = {
    "allow_anonymous_flows": "false",
    "allow_anonymous_user_lookup": "false",
    "flow_lock_role": "admin"
}
INIT_SAMPLE_FLOW = os.getenv("INIT_SAMPLE_FLOW", "true").lower() == "true"


def _ip_to_int(value: str) -> int:
    return int(ip_address(value))


def ensure_privilege_buckets(cur, conn):
    cur.execute("SELECT start_int, id FROM address_buckets WHERE kind='tier0';")
    existing = {row[0]: row[1] for row in cur.fetchall()}
    updated = False
    for octet in range(224, 240):
        start_ip = f"{octet}.0.0.0"
        end_ip = f"{octet}.255.255.255"
        start_int = _ip_to_int(start_ip)
        end_int = _ip_to_int(end_ip)
        size = end_int - start_int + 1
        if start_int in existing:
            continue
        cur.execute("""
            INSERT INTO address_buckets
                (kind, privilege_id, parent_id, start_ip, end_ip, start_int, end_int, size, description, memo, color, cidr, is_reserved, created_at, updated_at)
            VALUES
                ('tier0', NULL, NULL, %s::INET, %s::INET, %s, %s, %s, %s, NULL, NULL, %s, FALSE, NOW(), NOW())
            RETURNING id;
        """, (start_ip, end_ip, start_int, end_int, size, f"{octet}.0.0.0/8", f"{octet}.0.0.0/8"))
        bucket_id = cur.fetchone()[0]
        cur.execute("UPDATE address_buckets SET privilege_id=%s WHERE id=%s;", (bucket_id, bucket_id))
        updated = True
    if updated:
        conn.commit()


def init_db(max_retries: int = 10, wait_sec: int = 3):
    """
    Initialize database tables.
    Retry connection until PostgreSQL is ready.
    """

    # Retry connection until DB is ready
    for attempt in range(1, max_retries + 1):
        try:
            conn = psycopg2.connect(
                host=DB_HOST, port=DB_PORT,
                user=DB_USER, password=DB_PASS,
                dbname=DB_NAME
            )
            break
        except psycopg2.OperationalError as e:
            print(f"[init_db] Database connection failed (attempt {attempt}/{max_retries}): {e}")
            if attempt == max_retries:
                raise
            time.sleep(wait_sec)

    cur = conn.cursor()

    # --------------------------------------------------------
    # Users table
    # --------------------------------------------------------
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    # --------------------------------------------------------
    # Flows table (based on MCAM specification)
    # --------------------------------------------------------
    cur.execute("""
    CREATE TABLE IF NOT EXISTS flows (
        id SERIAL PRIMARY KEY,
        flow_id UUID UNIQUE NOT NULL,
        display_name TEXT,

        -- ST2022-7 A/B paths
        source_addr_a TEXT,
        source_port_a INTEGER,
        multicast_addr_a TEXT,
        group_port_a INTEGER,

        source_addr_b TEXT,
        source_port_b INTEGER,
        multicast_addr_b TEXT,
        group_port_b INTEGER,

        transport_protocol TEXT,

        -- NMOS metadata
        nmos_node_id UUID,
        nmos_flow_id UUID,
        nmos_sender_id UUID,
        nmos_device_id UUID,
        nmos_node_label TEXT,
        nmos_node_description TEXT,
        nmos_is04_host TEXT,
        nmos_is04_port INTEGER,
        nmos_is05_host TEXT,
        nmos_is05_port INTEGER,
        nmos_is04_base_url TEXT,
        nmos_is05_base_url TEXT,
        nmos_is04_version TEXT,
        nmos_is05_version TEXT,

        -- SDP info
        sdp_url TEXT,
        sdp_cache TEXT,

        -- Label/description
        nmos_label TEXT,
        nmos_description TEXT,
        management_url TEXT,

        -- Media info
        media_type TEXT,
        st2110_format TEXT,
        redundancy_group TEXT,

        -- Alias fields
        alias1 TEXT,
        alias2 TEXT,
        alias3 TEXT,
        alias4 TEXT,
        alias5 TEXT,
        alias6 TEXT,
        alias7 TEXT,
        alias8 TEXT,

        -- Status
        flow_status TEXT DEFAULT 'active',
        availability TEXT DEFAULT 'available',
        last_seen TIMESTAMP,

        -- Source info
        data_source TEXT CHECK (data_source IN ('manual', 'nmos', 'rds')) DEFAULT 'manual',
        rds_address TEXT,
        rds_api_url TEXT,
        rds_version TEXT,

        -- User fields
        user_field1 TEXT,
        user_field2 TEXT,
        user_field3 TEXT,
        user_field4 TEXT,
        user_field5 TEXT,
        user_field6 TEXT,
        user_field7 TEXT,
        user_field8 TEXT,

        note TEXT,
        locked BOOLEAN NOT NULL DEFAULT FALSE,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    # ensure columns exist for NMOS versions (for older DB)
    cur.execute("ALTER TABLE flows ADD COLUMN IF NOT EXISTS nmos_is04_version TEXT;")
    cur.execute("ALTER TABLE flows ADD COLUMN IF NOT EXISTS nmos_is05_version TEXT;")
    cur.execute("ALTER TABLE flows ADD COLUMN IF NOT EXISTS nmos_is04_base_url TEXT;")
    cur.execute("ALTER TABLE flows ADD COLUMN IF NOT EXISTS nmos_is05_base_url TEXT;")
    cur.execute("ALTER TABLE flows ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;")
    cur.execute("ALTER TABLE flows ADD COLUMN IF NOT EXISTS rds_version TEXT;")
    conn.commit()

    # --------------------------------------------------------
    # Checker run history
    # --------------------------------------------------------
    cur.execute("""
    CREATE TABLE IF NOT EXISTS checker_runs (
        kind TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        result JSONB NOT NULL,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    # --------------------------------------------------------
    # Address buckets (drives/folders/views)
    # --------------------------------------------------------
    cur.execute("""
    CREATE TABLE IF NOT EXISTS address_buckets (
        id SERIAL PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('tier0', 'parent', 'child')),
        privilege_id INTEGER REFERENCES address_buckets(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES address_buckets(id) ON DELETE CASCADE,
        start_ip INET NOT NULL,
        end_ip INET NOT NULL,
        start_int BIGINT NOT NULL,
        end_int BIGINT NOT NULL,
        size INTEGER NOT NULL,
        description TEXT,
        memo TEXT,
        color TEXT,
        cidr TEXT,
        is_reserved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()
    cur.execute("ALTER TABLE address_buckets ADD COLUMN IF NOT EXISTS cidr TEXT;")
    conn.commit()
    cur.execute("CREATE INDEX IF NOT EXISTS address_buckets_kind_idx ON address_buckets(kind);")
    cur.execute("CREATE INDEX IF NOT EXISTS address_buckets_privilege_idx ON address_buckets(privilege_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS address_buckets_parent_idx ON address_buckets(parent_id);")
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS address_buckets_range_idx ON address_buckets(kind, start_int, end_int);")
    conn.commit()
    ensure_privilege_buckets(cur, conn)

    insert_sample_flow(cur, conn)
    ensure_indexes(cur, conn)

    # --------------------------------------------------------
    # Settings table
    # --------------------------------------------------------
    cur.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    for key, value in SETTINGS_DEFAULTS.items():
        cur.execute("""
            INSERT INTO settings (key, value)
            VALUES (%s, %s)
            ON CONFLICT (key) DO NOTHING;
        """, (key, value))
    conn.commit()

    # --------------------------------------------------------
    # Scheduled jobs table (for automation)
    # --------------------------------------------------------
    cur.execute("""
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
        job_id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        schedule_type TEXT NOT NULL,
        schedule_value TEXT NOT NULL,
        last_run_at TIMESTAMP,
        last_run_status TEXT,
        last_run_result JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

    # Insert default jobs
    cur.execute("""
        INSERT INTO scheduled_jobs (job_id, job_type, enabled, schedule_type, schedule_value)
        VALUES ('collision_check', 'collision_check', FALSE, 'interval', '1800')
        ON CONFLICT (job_id) DO NOTHING;
    """)
    cur.execute("""
        INSERT INTO scheduled_jobs (job_id, job_type, enabled, schedule_type, schedule_value)
        VALUES ('nmos_check', 'nmos_check', FALSE, 'interval', '3600')
        ON CONFLICT (job_id) DO NOTHING;
    """)
    conn.commit()

    # --------------------------------------------------------
    # Insert initial admin user (optional)
    # --------------------------------------------------------
    if INIT_ADMIN:
        username = "admin"
        password = "admin"
        role = "admin"

        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        cur.execute("""
            INSERT INTO users (username, password_hash, role)
            VALUES (%s, %s, %s)
            ON CONFLICT (username) DO NOTHING;
        """, (username, hashed, role))
        conn.commit()
        print("DB initialized ✅ (admin user created)")
    else:
        print("DB initialized ✅ (no admin user created)")

    cur.close()
    conn.close()


def insert_sample_flow(cur, conn):
    if not INIT_SAMPLE_FLOW:
        return

    cur.execute("SELECT COUNT(*) FROM flows;")
    count = cur.fetchone()[0]
    if count > 0:
        return

    sample_flow_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO flows (
            flow_id, display_name,
            source_addr_a, source_port_a, multicast_addr_a, group_port_a,
            flow_status, availability, data_source,
            note
        ) VALUES (
            %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s
        )
    """, (
        sample_flow_id,
        "Sample Flow",
        "10.0.0.10", 5000,
        "239.0.0.10", 6000,
        "active", "available", "manual",
        "Initial sample flow for testing."
    ))
    conn.commit()
    print(f"Inserted sample flow {sample_flow_id}.")


def ensure_indexes(cur, conn):
    indexes = [
        "CREATE INDEX IF NOT EXISTS flows_updated_at_idx ON flows(updated_at DESC);",
        "CREATE INDEX IF NOT EXISTS flows_flow_status_idx ON flows(flow_status);",
        "CREATE INDEX IF NOT EXISTS flows_availability_idx ON flows(availability);",
        "CREATE INDEX IF NOT EXISTS flows_multicast_addr_a_idx ON flows(multicast_addr_a);",
        "CREATE INDEX IF NOT EXISTS flows_multicast_addr_b_idx ON flows(multicast_addr_b);",
        "CREATE INDEX IF NOT EXISTS flows_source_addr_a_idx ON flows(source_addr_a);",
        "CREATE INDEX IF NOT EXISTS flows_source_addr_b_idx ON flows(source_addr_b);",
        "CREATE INDEX IF NOT EXISTS flows_group_port_a_idx ON flows(group_port_a);",
        "CREATE INDEX IF NOT EXISTS flows_group_port_b_idx ON flows(group_port_b);",
        "CREATE INDEX IF NOT EXISTS flows_nmos_flow_id_idx ON flows(nmos_flow_id);",
        "CREATE INDEX IF NOT EXISTS flows_nmos_sender_id_idx ON flows(nmos_sender_id);"
    ]
    for statement in indexes:
        cur.execute(statement)
    conn.commit()
