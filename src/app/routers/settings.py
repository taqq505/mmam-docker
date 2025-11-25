from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth import require_roles
from app import settings_store

router = APIRouter()


class SettingUpdate(BaseModel):
    value: bool | str


@router.get("/settings")
def list_settings(user=Depends(require_roles("admin"))):
    return settings_store.list_settings()


@router.get("/settings/{key}")
def get_setting(key: str, user=Depends(require_roles("admin"))):
    try:
        value = settings_store.get_setting(key)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown setting")
    return {"key": key, "value": value}


@router.put("/settings/{key}")
def update_setting(key: str, payload: SettingUpdate, user=Depends(require_roles("admin"))):
    try:
        value = settings_store.update_setting(key, payload.value)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown setting")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"key": key, "value": value}
