import os, jwt, datetime
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app import settings_store

# --------------------------------------------------------
# JWT / Security settings
# JWT・セキュリティ設定
# --------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
ALGORITHM = "HS256"
AUTH_DISABLED = os.getenv("DISABLE_AUTH", "false").lower() == "true"

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/login",
    auto_error=False
)

# --------------------------------------------------------
# Create JWT token
# JWTトークン生成
# --------------------------------------------------------
def create_token(username: str, role: str):
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# --------------------------------------------------------
# Decode and verify JWT token
# JWTトークンをデコード・検証
# --------------------------------------------------------
def _decode_or_raise(token: str | None):
    if AUTH_DISABLED:
        return {"username": "dev", "role": "admin"}
    if not token:
        raise HTTPException(status_code=401, detail="Missing token / トークンが必要です")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"username": payload["sub"], "role": payload["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired / トークンの有効期限切れ")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token / 無効なトークン")


def decode_token(token: str | None = Depends(oauth2_scheme)):
    return _decode_or_raise(token)

# --------------------------------------------------------
# Role-based access helper
# 役割ベースのアクセス制御ヘルパー
# --------------------------------------------------------
def require_roles(*allowed_roles: str, allow_anonymous_setting: str | None = None, anonymous_role: str = "viewer"):
    """
    FastAPI dependency that ensures the current user has one of the specified roles.
    Optionally allows anonymous access when the given setting key evaluates to True.
    指定したロールのいずれかを持つか検証し、設定で匿名アクセスを許可できるDependsヘルパー。
    """
    def dependency(token: str | None = Depends(oauth2_scheme)):
        if AUTH_DISABLED:
            return {"username": "dev", "role": "admin"}

        if not token and allow_anonymous_setting:
            try:
                allow_anonymous = settings_store.get_setting(allow_anonymous_setting)
            except KeyError:
                allow_anonymous = False
            if allow_anonymous:
                return {"username": "anonymous", "role": anonymous_role}

        user = _decode_or_raise(token)
        if allowed_roles and user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Not enough privileges / 権限が不足しています"
            )
        return user
    return dependency
