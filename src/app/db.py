import os
import psycopg2

# --------------------------------------------------------
# Database connection settings
# データベース接続設定
# --------------------------------------------------------
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "mmam")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "secret")
DB_NAME = os.getenv("POSTGRES_DB", "mmam")

def get_db_connection():
    """
    Create and return a new PostgreSQL connection.
    新しいPostgreSQL接続を作成して返す。
    """
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASS,
        dbname=DB_NAME
    )
