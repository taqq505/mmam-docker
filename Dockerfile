# --------------------------------------------------------
# MMAM API - Dockerfile
# Python 3.11 slim image used for lightweight container
# 軽量な python:3.11-slim を使用
# --------------------------------------------------------
FROM python:3.11-slim

# Working directory inside the container
# コンテナ内の作業ディレクトリ
WORKDIR /app/src

# Copy dependency list and install
# 依存関係をコピーしてインストール
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application source code
# アプリケーションソースをコピー
COPY src/ /app/src

# Expose FastAPI port
# FastAPIの公開ポート
EXPOSE 8080

# Launch FastAPI with autoreload (development mode)
# 開発用: オートリロード付きで起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
