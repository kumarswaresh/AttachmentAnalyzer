#!/bin/bash

# SSL Certificate Setup Script for AI Agent Platform
# This script configures SSL certificates using Let's Encrypt/Certbot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Parse command line arguments
DOMAIN_NAME=""
EMAIL=""
FORCE_RENEWAL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --force)
            FORCE_RENEWAL=true
            shift
            ;;
        --help)
            echo "Usage: $0 --domain DOMAIN --email EMAIL [--force]"
            echo ""
            echo "Options:"
            echo "  --domain DOMAIN    Domain name for SSL certificate"
            echo "  --email EMAIL      Email for Let's Encrypt notifications"
            echo "  --force           Force certificate renewal"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$DOMAIN_NAME" ]; then
    print_error "Domain name is required (--domain)"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    print_error "Email is required (--email)"
    exit 1
fi

# Function to install certbot
install_certbot() {
    print_status "Installing Certbot..."
    
    # Update package list
    apt-get update
    
    # Install snapd if not already installed
    if ! command -v snap &> /dev/null; then
        apt-get install -y snapd
        systemctl enable --now snapd.socket
        # Wait for snapd to be ready
        sleep 10
    fi
    
    # Install certbot via snap (recommended method)
    snap install core; snap refresh core
    snap install --classic certbot
    
    # Create symlink
    ln -sf /snap/bin/certbot /usr/bin/certbot
    
    print_success "Certbot installed successfully"
}

# Function to validate domain
validate_domain() {
    print_status "Validating domain $DOMAIN_NAME..."
    
    # Check if domain resolves to this server
    SERVER_IP=$(curl -s http://checkip.amazonaws.com/ || curl -s http://ipinfo.io/ip)
    DOMAIN_IP=$(dig +short "$DOMAIN_NAME" | tail -n1)
    
    if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
        print_warning "Domain $DOMAIN_NAME does not resolve to this server ($SERVER_IP vs $DOMAIN_IP)"
        print_warning "Make sure your DNS A record points to $SERVER_IP"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Domain validation passed"
    fi
}

# Function to configure nginx for ACME challenge
configure_nginx_acme() {
    print_status "Configuring Nginx for ACME challenge..."
    
    # Create temporary nginx configuration for ACME challenge
    cat > /etc/nginx/sites-available/temp-ssl-setup << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # ACME challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }

    # Redirect all other traffic to HTTPS (after SSL is configured)
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

    # Create web root directory
    mkdir -p /var/www/html/.well-known/acme-challenge
    chown -R www-data:www-data /var/www/html
    
    # Enable temporary configuration
    ln -sf /etc/nginx/sites-available/temp-ssl-setup /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    nginx -t && systemctl reload nginx
    
    print_success "Nginx configured for ACME challenge"
}

# Function to obtain SSL certificate
obtain_certificate() {
    print_status "Obtaining SSL certificate for $DOMAIN_NAME..."
    
    # Prepare certbot command
    CERTBOT_CMD="certbot certonly --webroot -w /var/www/html -d $DOMAIN_NAME -d www.$DOMAIN_NAME --email $EMAIL --agree-tos --non-interactive"
    
    if [ "$FORCE_RENEWAL" = true ]; then
        CERTBOT_CMD="$CERTBOT_CMD --force-renewal"
    fi
    
    # Run certbot
    if $CERTBOT_CMD; then
        print_success "SSL certificate obtained successfully"
    else
        print_error "Failed to obtain SSL certificate"
        exit 1
    fi
}

# Function to configure nginx with SSL
configure_nginx_ssl() {
    print_status "Configuring Nginx with SSL..."
    
    # Remove temporary configuration
    rm -f /etc/nginx/sites-enabled/temp-ssl-setup
    
    # Create SSL-enabled nginx configuration
    cat > /etc/nginx/sites-available/ai-agent-ssl << EOF
# AI Agent Platform Nginx Configuration with SSL

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;

# Upstream backend
upstream ai_agent_backend {
    least_conn;
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # ACME challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN_NAME/chain.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Hide server information
    server_tokens off;

    # Request size limits
    client_max_body_size 10M;
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;

    # Timeout settings
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://ai_agent_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Login endpoints with stricter rate limiting
    location ~ ^/api/(login|auth)/ {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://ai_agent_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Static files with aggressive caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        
        # Try static files first, then backend
        try_files \$uri @backend;
    }

    # Main application
    location / {
        proxy_pass http://ai_agent_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Fallback to backend for any unmatched static files
    location @backend {
        proxy_pass http://ai_agent_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ /(package\.json|package-lock\.json|\.env.*|ecosystem\.config\.js)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

    # Enable SSL configuration
    ln -sf /etc/nginx/sites-available/ai-agent-ssl /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/ai-agent
    
    # Test nginx configuration
    if nginx -t; then
        systemctl reload nginx
        print_success "Nginx SSL configuration applied"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
}

# Function to setup auto-renewal
setup_auto_renewal() {
    print_status "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/certbot-renew.sh << 'EOF'
#!/bin/bash

# Certbot renewal script with nginx reload
LOG_FILE="/var/log/letsencrypt/renewal.log"

echo "$(date): Starting certificate renewal check" >> $LOG_FILE

# Attempt renewal
if certbot renew --quiet --deploy-hook "systemctl reload nginx"; then
    echo "$(date): Certificate renewal check completed successfully" >> $LOG_FILE
else
    echo "$(date): Certificate renewal check failed" >> $LOG_FILE
    exit 1
fi
EOF

    chmod +x /usr/local/bin/certbot-renew.sh
    
    # Add to crontab (run twice daily)
    (crontab -l 2>/dev/null | grep -v certbot-renew; echo "0 2,14 * * * /usr/local/bin/certbot-renew.sh") | crontab -
    
    # Create systemd timer as backup
    cat > /etc/systemd/system/certbot-renewal.service << 'EOF'
[Unit]
Description=Certbot Renewal
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/certbot-renew.sh
User=root
EOF

    cat > /etc/systemd/system/certbot-renewal.timer << 'EOF'
[Unit]
Description=Run certbot renewal twice daily
Requires=certbot-renewal.service

[Timer]
OnCalendar=*-*-* 02,14:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable certbot-renewal.timer
    systemctl start certbot-renewal.timer
    
    print_success "Auto-renewal configured"
}

# Function to test SSL configuration
test_ssl() {
    print_status "Testing SSL configuration..."
    
    # Wait a moment for nginx to fully reload
    sleep 5
    
    # Test HTTPS connection
    if curl -s -I "https://$DOMAIN_NAME/health" | grep -q "200 OK"; then
        print_success "HTTPS connection test passed"
    else
        print_warning "HTTPS connection test failed"
    fi
    
    # Test HTTP to HTTPS redirect
    if curl -s -I "http://$DOMAIN_NAME" | grep -q "301"; then
        print_success "HTTP to HTTPS redirect working"
    else
        print_warning "HTTP to HTTPS redirect not working"
    fi
    
    # Test SSL grade (optional)
    print_status "SSL configuration complete. You can test your SSL grade at:"
    print_status "https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN_NAME"
}

# Main function
main() {
    print_status "Starting SSL setup for $DOMAIN_NAME..."
    
    install_certbot
    validate_domain
    configure_nginx_acme
    obtain_certificate
    configure_nginx_ssl
    setup_auto_renewal
    test_ssl
    
    print_success "SSL setup completed successfully!"
    print_status ""
    print_status "Your site is now available at:"
    print_status "  https://$DOMAIN_NAME"
    print_status "  https://www.$DOMAIN_NAME"
    print_status ""
    print_status "Certificate will auto-renew twice daily"
    print_status "Manual renewal: certbot renew"
    print_status "Check renewal timer: systemctl status certbot-renewal.timer"
}

# Run main function
main