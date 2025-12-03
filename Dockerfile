# --------------------------------------------------------
# MMAM API - Dockerfile
# Python 3.11 slim image used for lightweight container
# 軽量な python:3.11-slim を使用
# --------------------------------------------------------
FROM python:3.11-slim

# Working directory inside the container
# コンテナ内の作業ディレクトリ
WORKDIR /app/src

# Install OpenSSL for certificate generation
# 証明書生成用にOpenSSLをインストール
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy dependency list and install
# 依存関係をコピーしてインストール
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application source code
# アプリケーションソースをコピー
COPY src/ /app/src

# Expose FastAPI ports (HTTP and HTTPS)
# FastAPIの公開ポート (HTTP と HTTPS)
EXPOSE 8080 8443

# Default command (can be overridden by entrypoint)
# デフォルトコマンド (エントリーポイントで上書き可能)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
