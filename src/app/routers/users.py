from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, constr
from app.db import get_db_connection
from app.auth import create_token, decode_token, require_roles
import bcrypt

router = APIRouter()
ALLOWED_ROLES = {"viewer", "editor", "admin"}


class UserCreate(BaseModel):
    username: constr(min_length=3, max_length=64)
    password: constr(min_length=4, max_length=128)
    role: str

    def ensure_valid(self):
        if self.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")


class UserUpdate(BaseModel):
    password: constr(min_length=4, max_length=128) | None = None
    role: str | None = None

    def ensure_valid(self):
        if self.role and self.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")


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


# --------------------------------------------------------
# GET /api/users
# List users (admin only)
# --------------------------------------------------------
@router.get("/users")
def list_users(user=Depends(require_roles("admin"))):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT username, role, created_at FROM users ORDER BY username;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"username": r[0], "role": r[1], "created_at": r[2]} for r in rows]


# --------------------------------------------------------
# POST /api/users
# Create new user (admin only)
# --------------------------------------------------------
@router.post("/users", status_code=201)
def create_user(payload: UserCreate, user=Depends(require_roles("admin"))):
    payload.ensure_valid()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM users WHERE username=%s;", (payload.username,))
    if cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=409, detail="User already exists")

    hashed = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    cur.execute(
        """
        INSERT INTO users (username, password_hash, role)
        VALUES (%s, %s, %s);
        """,
        (payload.username, hashed, payload.role)
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "username": payload.username}


# --------------------------------------------------------
# PATCH /api/users/{username}
# Update password and/or role (admin only)
# --------------------------------------------------------
@router.patch("/users/{username}")
def update_user(username: str, payload: UserUpdate, user=Depends(require_roles("admin"))):
    payload.ensure_valid()
    updates = []
    values = []
    updated_fields = []

    if payload.password:
        hashed = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
        updates.append("password_hash = %s")
        values.append(hashed)
        updated_fields.append("password")

    if payload.role:
        updates.append("role = %s")
        values.append(payload.role)
        updated_fields.append("role")

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    values.append(username)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE username=%s;", values)
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "username": username, "updated_fields": updated_fields}


# --------------------------------------------------------
# DELETE /api/users/{username}
# Remove user (admin only)
# --------------------------------------------------------
@router.delete("/users/{username}")
def delete_user(username: str, user=Depends(require_roles("admin"))):
    if user["username"] == username:
        raise HTTPException(status_code=400, detail="Cannot delete current user")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE username=%s;", (username,))
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    conn.commit()
    cur.close()
    conn.close()
    return {"result": "ok", "username": username, "deleted": True}
