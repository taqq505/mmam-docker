import os, jwt, datetime
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

# --------------------------------------------------------
# JWT / Security settings
# JWT・セキュリティ設定
# --------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

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
def decode_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"username": payload["sub"], "role": payload["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired / トークンの有効期限切れ")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token / 無効なトークン")
