import json
import os
import threading
from typing import Any, Dict, Optional

try:
    from paho.mqtt import client as mqtt  # type: ignore
except ImportError:  # pragma: no cover
    mqtt = None


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


MQTT_ENABLED = _env_flag("MQTT_ENABLED", False)
MQTT_HOST = os.getenv("MQTT_HOST", "mqtt")
MQTT_PORT = _env_int("MQTT_PORT", 1883)
MQTT_USERNAME = os.getenv("MQTT_USERNAME") or None
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD") or None
MQTT_CLIENT_ID = os.getenv("MQTT_CLIENT_ID", "mmam-api")
MQTT_KEEPALIVE = _env_int("MQTT_KEEPALIVE", 60)
MQTT_TOPIC_FLOW_UPDATES = os.getenv("MQTT_TOPIC_FLOW_UPDATES", "mmam/flows/events")

MQTT_WS_URL = os.getenv("MQTT_WS_URL", "")
MQTT_WS_USERNAME = os.getenv("MQTT_WS_USERNAME", "")
MQTT_WS_PASSWORD = os.getenv("MQTT_WS_PASSWORD", "")
MQTT_WS_CLIENT_ID = os.getenv("MQTT_WS_CLIENT_ID", "mmam-ui")

_client_lock = threading.Lock()
_client: Optional["mqtt.Client"] = None


def is_enabled() -> bool:
    return MQTT_ENABLED and mqtt is not None


def _ensure_client_locked() -> Optional["mqtt.Client"]:
    global _client
    if _client is not None:
        return _client
    if not is_enabled():
        return None
    if not MQTT_HOST:
        return None
    try:
        client = mqtt.Client(client_id=MQTT_CLIENT_ID, clean_session=True)
        if MQTT_USERNAME:
            client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD or "")
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=MQTT_KEEPALIVE)
        client.loop_start()
        _client = client
        print(f"[mqtt] Connected to {MQTT_HOST}:{MQTT_PORT}")
    except Exception as exc:  # pragma: no cover - log only
        print(f"[mqtt] Connection failed: {exc}")
        _client = None
    return _client


def ensure_client() -> Optional["mqtt.Client"]:
    with _client_lock:
        return _ensure_client_locked()


def shutdown():
    global _client
    with _client_lock:
        if _client:
            try:
                _client.loop_stop()
                _client.disconnect()
                print("[mqtt] Disconnected")
            except Exception:
                pass
        _client = None


def publish_flow_event(event_type: str, flow_id: str, flow: Optional[Dict[str, Any]] = None, diff: Optional[Dict[str, Any]] = None) -> bool:
    if not is_enabled():
        return False
    client = ensure_client()
    if not client:
        return False
    topic_base = (MQTT_TOPIC_FLOW_UPDATES or "").strip().rstrip("/")
    if not topic_base:
        return False
    payload = {
        "event": event_type,
        "flow_id": flow_id
    }
    if flow is not None:
        payload["flow"] = flow
    if diff:
        payload["diff"] = diff
    try:
        topics = [f"{topic_base}/all"]
        if flow_id:
            topics.append(f"{topic_base}/flow/{flow_id}")
        encoded = json.dumps(payload, default=str)
        for topic in topics:
            client.publish(topic, encoded, qos=0, retain=False)
        return True
    except Exception as exc:  # pragma: no cover - best effort
        print(f"[mqtt] Publish failed: {exc}")
        return False


def get_frontend_config() -> Dict[str, Any]:
    topic_base = (MQTT_TOPIC_FLOW_UPDATES or "").strip().rstrip("/")
    enabled = is_enabled() and bool(MQTT_WS_URL) and bool(topic_base)
    topic_all = f"{topic_base}/all" if topic_base else ""
    topic_flow_prefix = f"{topic_base}/flow" if topic_base else ""
    return {
        "enabled": bool(enabled),
        "ws_url": MQTT_WS_URL,
        "topic": topic_all,
        "topic_all": topic_all,
        "topic_flow_prefix": topic_flow_prefix,
        "topic_base": topic_base,
        "username": MQTT_WS_USERNAME,
        "password": MQTT_WS_PASSWORD,
        "client_id_prefix": MQTT_WS_CLIENT_ID or "mmam-ui"
    }
