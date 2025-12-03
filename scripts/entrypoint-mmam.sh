#!/bin/bash
# Entrypoint script for MMAM FastAPI service with HTTPS support
set -e

CERT_DIR="${CERT_DIR:-/certs}"
CERT_FILE="${CERT_FILE:-$CERT_DIR/server.crt}"
KEY_FILE="${KEY_FILE:-$CERT_DIR/server.key}"
HTTP_PORT="${HTTP_PORT:-8080}"
HTTPS_PORT="${HTTPS_PORT:-8443}"
HTTPS_ENABLED="${HTTPS_ENABLED:-true}"

echo "==================================="
echo "MMAM FastAPI Service Starting"
echo "==================================="

# Check if certificates exist
if [ "$HTTPS_ENABLED" = "true" ]; then
    if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
        echo "Certificates not found. Generating self-signed certificate..."
        /app/scripts/generate-cert.sh
    else
        echo "Using existing certificates:"
        echo "  Certificate: $CERT_FILE"
        echo "  Private Key: $KEY_FILE"
    fi
fi

# Start uvicorn with HTTP and HTTPS
if [ "$HTTPS_ENABLED" = "true" ]; then
    echo "Starting uvicorn with HTTP ($HTTP_PORT) and HTTPS ($HTTPS_PORT)..."

    # Start HTTP server in background
    uvicorn app.main:app \
        --host 0.0.0.0 \
        --port "$HTTP_PORT" \
        --reload &

    HTTP_PID=$!
    echo "✓ HTTP server started (PID: $HTTP_PID)"

    # Start HTTPS server in foreground
    uvicorn app.main:app \
        --host 0.0.0.0 \
        --port "$HTTPS_PORT" \
        --ssl-keyfile "$KEY_FILE" \
        --ssl-certfile "$CERT_FILE" \
        --reload &

    HTTPS_PID=$!
    echo "✓ HTTPS server started (PID: $HTTPS_PID)"

    # Wait for both processes
    wait -n

    # If one exits, kill the other
    kill $HTTP_PID $HTTPS_PID 2>/dev/null || true
else
    echo "Starting uvicorn with HTTP only ($HTTP_PORT)..."
    uvicorn app.main:app \
        --host 0.0.0.0 \
        --port "$HTTP_PORT" \
        --reload
fi
