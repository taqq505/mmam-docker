#!/bin/sh
# Entrypoint script for Nginx UI service with HTTPS support
set -e

CERT_DIR="${CERT_DIR:-/certs}"
CERT_FILE="${CERT_FILE:-$CERT_DIR/server.crt}"
KEY_FILE="${KEY_FILE:-$CERT_DIR/server.key}"
UI_HTTP_PORT="${UI_HTTP_PORT:-4173}"
UI_HTTPS_PORT="${UI_HTTPS_PORT:-4174}"
HTTPS_ENABLED="${HTTPS_ENABLED:-true}"

echo "==================================="
echo "MMAM UI (Nginx) Service Starting"
echo "==================================="

# Wait for certificates if HTTPS is enabled
if [ "$HTTPS_ENABLED" = "true" ]; then
    echo "Waiting for certificates..."
    WAIT_COUNT=0
    while [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; do
        if [ $WAIT_COUNT -ge 30 ]; then
            echo "ERROR: Certificates not found after 30 seconds"
            exit 1
        fi
        echo "  Waiting for $CERT_FILE and $KEY_FILE..."
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
    done
    echo "✓ Certificates found"
fi

# Generate Nginx configuration
NGINX_CONF="/etc/nginx/conf.d/default.conf"

cat > "$NGINX_CONF" <<'EOF'
# HTTP server
server {
    listen UI_HTTP_PORT_PLACEHOLDER;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

if [ "$HTTPS_ENABLED" = "true" ]; then
    cat >> "$NGINX_CONF" <<'EOF'

# HTTPS server
server {
    listen UI_HTTPS_PORT_PLACEHOLDER ssl;
    server_name _;

    ssl_certificate CERT_FILE_PLACEHOLDER;
    ssl_certificate_key KEY_FILE_PLACEHOLDER;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;
}
EOF
fi

# Replace placeholders
sed -i "s|UI_HTTP_PORT_PLACEHOLDER|$UI_HTTP_PORT|g" "$NGINX_CONF"
sed -i "s|UI_HTTPS_PORT_PLACEHOLDER|$UI_HTTPS_PORT|g" "$NGINX_CONF"
sed -i "s|CERT_FILE_PLACEHOLDER|$CERT_FILE|g" "$NGINX_CONF"
sed -i "s|KEY_FILE_PLACEHOLDER|$KEY_FILE|g" "$NGINX_CONF"

echo "Nginx configuration generated:"
cat "$NGINX_CONF"
echo ""
echo "Starting Nginx..."

if [ "$HTTPS_ENABLED" = "true" ]; then
    echo "✓ HTTP available on port $UI_HTTP_PORT"
    echo "✓ HTTPS available on port $UI_HTTPS_PORT"
else
    echo "✓ HTTP available on port $UI_HTTP_PORT"
fi

# Start Nginx
exec nginx -g 'daemon off;'
