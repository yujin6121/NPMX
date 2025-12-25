#!/bin/bash
set -e

# Ensure directories exist
mkdir -p /data/nginx/proxy_host /data/nginx/temp /data/html /data/letsencrypt /data/logs /data/custom_ssl /tmp/acme-challenge

# Generate self-signed certificate if it doesn't exist
NGINX_CONFIG_DIR=${NGINX_CONFIG_DIR:-/data/nginx}
CERT_PATH="$NGINX_CONFIG_DIR/default_cert.pem"
KEY_PATH="$NGINX_CONFIG_DIR/default_cert.key"

if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
    echo "Generating self-signed certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_PATH" -out "$CERT_PATH" \
        -subj "/C=KR/ST=Seoul/L=Seoul/O=Better NPM/CN=default.local"
    echo "Self-signed certificate generated"
fi

# Copy HTML files if they exist
if [ -d "/app/backend/html" ] && [ ! -f "/data/html/default-http.html" ]; then
    cp -r /app/backend/html/* /data/html/ || true
fi

# Run database migrations
cd /app/backend
node migrate.js

# Start Nginx in background
nginx

# Start Node.js backend
exec node index.js
