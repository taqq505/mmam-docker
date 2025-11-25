from typing import Dict, Any
from app.db import get_db_connection

SETTINGS_SCHEMA: Dict[str, Dict[str, Any]] = {
    "allow_anonymous_flows": {
        "type": "bool",
        "default": False,
        "description": "Allow unauthenticated clients to fetch /api/flows."
    },
    "allow_anonymous_user_lookup": {
        "type": "bool",
        "default": False,
        "description": "Allow unauthenticated access to /api/users endpoints."
    },
}


def _normalize_input(key: str, value: Any) -> str:
    definition = SETTINGS_SCHEMA.get(key)
    if not definition:
        raise KeyError(key)

    if definition["type"] == "bool":
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, str):
            lower = value.lower()
            if lower in {"true", "false"}:
                return lower
        raise ValueError("Value must be boolean")

    # fallback to string
    return str(value)


def _convert_output(key: str, raw_value: str) -> Any:
    definition = SETTINGS_SCHEMA.get(key)
    if not definition:
        raise KeyError(key)

    if definition["type"] == "bool":
        return raw_value.lower() == "true"
    return raw_value


def list_settings() -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM settings;")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    result = {key: SETTINGS_SCHEMA[key]["default"] for key in SETTINGS_SCHEMA}
    for key, value in rows:
        if key in SETTINGS_SCHEMA:
            result[key] = _convert_output(key, value)
    return result


def get_setting(key: str) -> Any:
    definition = SETTINGS_SCHEMA.get(key)
    if not definition:
        raise KeyError(key)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT value FROM settings WHERE key=%s;", (key,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return definition["default"]
    return _convert_output(key, row[0])


def update_setting(key: str, value: Any) -> Any:
    normalized = _normalize_input(key, value)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO settings (key, value, updated_at)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP;
        """,
        (key, normalized)
    )
    conn.commit()
    cur.close()
    conn.close()
    return _convert_output(key, normalized)
