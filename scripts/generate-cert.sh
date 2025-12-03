#!/bin/bash
# Generate self-signed SSL certificate for HTTPS support
set -e

CERT_DIR="${CERT_DIR:-/certs}"
CERT_FILE="${CERT_FILE:-$CERT_DIR/server.crt}"
KEY_FILE="${KEY_FILE:-$CERT_DIR/server.key}"
CERT_CN="${CERT_CN:-localhost}"
CERT_SANS="${CERT_SANS:-DNS:localhost,DNS:*.local,IP:127.0.0.1}"
CERT_DAYS="${CERT_DAYS:-3650}"

echo "Generating self-signed certificate..."
echo "  CN: $CERT_CN"
echo "  SANs: $CERT_SANS"
echo "  Valid for: $CERT_DAYS days"

# Create certificate directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate SAN configuration
SAN_CONFIG=$(mktemp)
cat > "$SAN_CONFIG" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=JP
ST=Tokyo
L=Tokyo
O=MMAM
OU=IT
CN=$CERT_CN

[v3_req]
subjectAltName = @alt_names

[alt_names]
EOF

# Parse CERT_SANS and add to config
IFS=',' read -ra SANS <<< "$CERT_SANS"
dns_count=1
ip_count=1
for san in "${SANS[@]}"; do
    san=$(echo "$san" | xargs) # trim whitespace
    if [[ $san == DNS:* ]]; then
        echo "DNS.$dns_count = ${san#DNS:}" >> "$SAN_CONFIG"
        ((dns_count++))
    elif [[ $san == IP:* ]]; then
        echo "IP.$ip_count = ${san#IP:}" >> "$SAN_CONFIG"
        ((ip_count++))
    fi
done

# Generate private key and certificate
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days "$CERT_DAYS" \
    -config "$SAN_CONFIG" \
    -extensions v3_req

# Clean up
rm -f "$SAN_CONFIG"

# Set permissions
chmod 644 "$CERT_FILE"
chmod 600 "$KEY_FILE"

echo "✓ Certificate generated successfully:"
echo "  Certificate: $CERT_FILE"
echo "  Private Key: $KEY_FILE"

# Display certificate info
openssl x509 -in "$CERT_FILE" -noout -text | grep -A1 "Subject Alternative Name" || true
