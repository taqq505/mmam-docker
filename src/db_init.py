import os
import psycopg2
import time
import bcrypt

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
    "allow_anonymous_user_lookup": "false"
}


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
        nmos_flow_id UUID,
        nmos_sender_id UUID,
        nmos_device_id UUID,
        nmos_is04_host TEXT,
        nmos_is04_port INTEGER,
        nmos_is05_host TEXT,
        nmos_is05_port INTEGER,

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

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()

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
