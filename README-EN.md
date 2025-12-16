# NPMX

This is a reverse proxy developed in collaboration with Vibe Code to replace NPM.

## ✨ Key Features

### Proxy Management
- **HTTP/3 & QUIC** - Faster connections with next-generation protocols
- **Auto SSL Certificates** - Automatic issuance and renewal via Let's Encrypt (30 days before expiration)
- **Unlimited File Uploads** - No upload size restrictions
- **WebSocket Support** - Full WebSocket proxy functionality
- **Custom Location** - Advanced Nginx location block configuration

### Security
- **WAF Integration** - ModSecurity and OWASP Core Rule Set
- **GeoIP Filtering** - Country-based access control
- **Two-Factor Authentication** - TOTP-based 2FA
- **Attack Blocking** - Defends against common attack patterns
- **SSL/TLS Enforcement** - HTTPS redirection

### Monitoring
- **Activity Log** - Comprehensive audit trail
  - Date, action type, keyword filtering
  - CSV export
  - Real-time statistics (requests, error rate, unique IPs)
  - IP address and User Agent tracking
- **System Monitoring** - CPU, memory, disk usage dashboard
- **Traffic Statistics** - Analyze request count and error rate

### User Experience
- **Dark Mode** - Eye-friendly dark theme
- **Multilingual Support** - Korean and English
- **Profile Management** - Upload avatar, change email/password
- **Backup & Restore** - Database backup/restore
- **Port Scanner** - Built-in network port scanning tool

## 🚀 Quick Start (Docker)

### 1. Install Docker Compose

```bash
# Clone repository
git clone <repository-url>
cd npmx

# Set environment
cp .env.docker .env

# Edit .env file
nano .env

# Start services
docker-compose up -d

# View logs
docker-compose logs -f npmx
```

**Default Account:**
- Email: `admin@example.com`
- Password: `changeme`

⚠️ **Change the default password immediately after your first login!**

### 2. Environment Variable Setup

Modify the `.env` file:

```bash
# JWT Secret - Must be changed!
JWT_SECRET=Enter-a-strong-random-key-here

# Default admin account
DEFAULT_EMAIL=admin@example.com
DEFAULT_PASSWORD=changeme

# Let's Encrypt configuration
LETSENCRYPT_STAGING=false  # Set to true for testing

# Debug mode
DEBUG=false
```

### 3. Accessing the Dashboard

Access the following address in your browser:
- **HTTP**: `http://localhost:81`
- **HTTPS**: `https://localhost:4443`

## 📖 User Guide

### Adding a Proxy Host

1. **Add New Host**
   - Enter domain names (multiple allowed, separated by commas)
   - Select forwarding scheme (http/https)
   - Enter target host and port
   - Select SSL certificate
   - Choose whether to enable HTTP/3

2. **SSL Certificate**
   - Let's Encrypt auto-issuance
   - Auto-renewal 30 days before expiration
   - Supports multiple domains with one certificate
   - SSL/HTTPS forced option

3. **Advanced Options**
   - Custom Nginx location
   - WebSocket upgrade support
   - Cache control
   - General attack blocking

### Security Features

1. **WAF (Web Application Firewall)**
   - Enable ModSecurity per host
   - Mode selection: DetectionOnly or On (Block)
   - Paranoia level 1-4
   - OWASP Core Rule Set applied

2. **GeoIP Filtering**
   - Allow specific countries
   - Block specific countries
   - Uses ISO country codes (e.g., US, KR, CN)

3. **Two-Factor Authentication**
   - TOTP-based (Google Authenticator, Authy)
   - QR code setup
   - Backup codes provided

### Activity Monitoring

1. **Activity Log**
   - View all user actions
   - Filter by date range
   - Search by keyword, IP, or action
   - Export to CSV

2. **Statistics Dashboard**
   - Total requests
   - Error count and error rate
   - Unique IP addresses
   - Action classification

3. **System Monitoring**
   - Real-time CPU usage
   - Memory usage
   - Disk space
   - System uptime

## 🐛 Troubleshooting

### Login Issues

1. **“Invalid email or password”**
   - Use default account: `admin@example.com` / `changeme`
   - Reset database: `docker-compose down -v && docker-compose up -d`

2. **No error message displayed upon login failure**
   - Check browser console for errors
   - Check backend logs: `docker-compose logs -f npmx`

### SSL Certificate Issues

1. **Let's Encrypt rate limit**
   - Set `LETSENCRYPT_STAGING=true` during testing
   - Wait for rate limit to reset (weekly/daily limits)

2. **Certificate not renewing**
   - Check certbot logs in the container
   - Verify DNS records point to the server

### Performance Issues

1. **Slow Proxy Response**
   - Check system resources (CPU/Memory)
   - Verify target host responsiveness
   - Enable caching if applicable

2. **High Memory Usage**
   - Review active connections
   - Check WAF rules (high paranoia level)

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Credits

This project was inspired by:
- [Nginx Proxy Manager](https://github.com/NginxProxyManager/nginx-proxy-manager)
- [NPMplus](https://github.com/ZoeyVid/NPMplus)

---

**NPMX - Made with ❤️ using Node.js, React, Nginx, and ModSecurity**