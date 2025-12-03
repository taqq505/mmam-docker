# SSL/TLS Certificates Directory

This directory contains SSL/TLS certificates for HTTPS support.

## Certificate Files

### For Corporate CA-signed Certificates

Place your corporate CA-issued certificates here before running `docker-compose up`:

```
certs/
├── server.crt    # Server certificate (required)
├── server.key    # Private key (required)
└── ca.crt        # CA certificate chain (optional)
```

### For Self-Signed Certificates

If no certificates are found, the system will automatically generate self-signed certificates on startup.

Generated files:
```
certs/
├── server.crt    # Self-signed certificate (auto-generated)
└── server.key    # Private key (auto-generated)
```

## Configuration

Certificate settings can be configured in `.env`:

```bash
# Certificate paths (container paths)
CERT_FILE=/certs/server.crt
KEY_FILE=/certs/server.key
CA_FILE=/certs/ca.crt

# Self-signed certificate settings
CERT_CN=localhost
CERT_SANS=DNS:localhost,DNS:*.local,IP:127.0.0.1
CERT_DAYS=3650
```

## Security Notes

- Certificate files are excluded from Git via `.gitignore`
- Keep your private keys secure
- Self-signed certificates will show browser warnings (expected behavior)
- For production use, obtain certificates from a trusted CA
