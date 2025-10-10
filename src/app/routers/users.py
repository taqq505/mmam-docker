from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.db import get_db_connection
from app.auth import create_token, decode_token
import bcrypt

router = APIRouter()

# --------------------------------------------------------
# POST /api/login
# User login → issue JWT token
# ユーザーログイン → JWTトークン発行
# --------------------------------------------------------
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT username, password_hash, role FROM users WHERE username=%s", (form_data.username,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row or not bcrypt.checkpw(form_data.password.encode(), row[1].encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials / 認証失敗")

    token = create_token(row[0], row[2])
    return {"access_token": token, "token_type": "bearer"}

# --------------------------------------------------------
# GET /api/me
# Return current user info (from token)
# 現在のユーザー情報を返す（トークン検証）
# --------------------------------------------------------
@router.get("/me")
def me(user=Depends(decode_token)):
    return user
