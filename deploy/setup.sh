#!/bin/bash

# ShareFile Deployment Script
# Run with sudo

set -e

echo "========================================="
echo "ShareFile Deployment"
echo "========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "Step 1: Add dnsmasq entry"
echo "-----------------------------------------"
if ! grep -q "share.codebat.ai" /etc/dnsmasq.d/nextcloud-internal.conf 2>/dev/null; then
    echo "address=/share.codebat.ai/10.8.0.1" >> /etc/dnsmasq.d/nextcloud-internal.conf
    echo "address=/admin.share.codebat.ai/10.8.0.1" >> /etc/dnsmasq.d/nextcloud-internal.conf
    echo "✓ Added DNS entries"
    systemctl restart dnsmasq
    echo "✓ Restarted dnsmasq"
else
    echo "✓ DNS entries already exist"
fi

echo ""
echo "Step 2: Get SSL certificate"
echo "-----------------------------------------"
if [ ! -f /etc/letsencrypt/live/share.codebat.ai/fullchain.pem ]; then
    echo "Getting SSL certificate for share.codebat.ai..."
    certbot certonly --nginx -d share.codebat.ai -d admin.share.codebat.ai --non-interactive --agree-tos
    echo "✓ SSL certificate obtained"
else
    echo "✓ SSL certificate already exists"
fi

echo ""
echo "Step 3: Add nginx rate limit zone"
echo "-----------------------------------------"
if ! grep -q "limit_req_zone.*sharefile" /etc/nginx/nginx.conf 2>/dev/null; then
    # Add rate limit zone to http block in nginx.conf
    sed -i '/http {/a \    limit_req_zone $binary_remote_addr zone=sharefile:10m rate=10r/s;' /etc/nginx/nginx.conf
    echo "✓ Added rate limit zone to nginx.conf"
else
    echo "✓ Rate limit zone already exists"
fi

echo ""
echo "Step 4: Install nginx configs"
echo "-----------------------------------------"
cp "$SCRIPT_DIR/nginx-sharefile.conf" /etc/nginx/sites-available/sharefile-download
cp "$SCRIPT_DIR/nginx-sharefile-admin.conf" /etc/nginx/sites-available/sharefile-admin

# Enable sites
ln -sf /etc/nginx/sites-available/sharefile-download /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/sharefile-admin /etc/nginx/sites-enabled/

echo "✓ Installed nginx configs"

echo ""
echo "Step 5: Test and reload nginx"
echo "-----------------------------------------"
nginx -t
systemctl reload nginx
echo "✓ Nginx reloaded"

echo ""
echo "Step 6: Create systemd service"
echo "-----------------------------------------"
cat > /etc/systemd/system/sharefile.service << EOF
[Unit]
Description=ShareFile Server
After=network.target postgresql.service

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/npm run dev:dual
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable sharefile
echo "✓ Created systemd service"

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "URLs:"
echo "  Download (Public): https://share.codebat.ai/download/[id]"
echo "  Admin (VPN only):  https://admin.share.codebat.ai/admin"
echo ""
echo "To start the service:"
echo "  sudo systemctl start sharefile"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u sharefile -f"
echo ""
