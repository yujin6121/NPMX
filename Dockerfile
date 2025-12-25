# Multi-stage build for Better NPM with HTTP/3

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Final runtime with Nginx-QUIC
FROM zoeyvid/nginx-quic:latest

# Install Node.js and runtime dependencies
RUN apk upgrade --no-cache -a && \
    apk add --no-cache \
    nodejs npm \
    ca-certificates certbot \
    curl openssl bash tzdata

# Create necessary directories
RUN mkdir -p \
    /data/nginx/proxy_host \
    /data/nginx/temp \
    /data/html \
    /data/letsencrypt \
    /data/logs \
    /data/custom_ssl \
    /tmp/acme-challenge \
    /var/log/nginx \
    /var/cache/nginx \
    /run

# Copy backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN set -ex \
    && apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm install --omit=dev \
    && apk del .build-deps

COPY backend/ ./

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy ModSecurity configurations
COPY backend/modsecurity/ /etc/nginx/modsec/

# Copy Nginx config
COPY backend/nginx.conf /usr/local/nginx/conf/nginx.conf

# Copy HTML files for default pages
COPY backend/html/ /app/backend/html/

# Generate self-signed certificate for initial setup
RUN mkdir -p /usr/local/nginx/conf/ssl \
    && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /usr/local/nginx/conf/ssl/key.pem \
        -out /usr/local/nginx/conf/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Copy startup script
COPY backend/start.sh /start.sh
RUN chmod +x /start.sh

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/database.sqlite \
    NGINX_CONFIG_DIR=/data/nginx \
    LETSENCRYPT_DIR=/data/letsencrypt

EXPOSE 80 81 443 443/udp

VOLUME ["/data"]

ENTRYPOINT ["/start.sh"]
