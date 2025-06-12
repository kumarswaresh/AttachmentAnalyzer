#!/bin/bash

# AWS EC2 User Data Script for AI Agent Platform
# Ubuntu 22.04 LTS setup with Node.js 20, Nginx, PM2

set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install essential packages
apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt-get install -y nginx

# Install PostgreSQL client
apt-get install -y postgresql-client

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
apt-get install -y unzip
unzip awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Create application user
useradd -m -s /bin/bash -G sudo aiagent
mkdir -p /home/aiagent/.ssh
mkdir -p /opt/ai-agent
chown -R aiagent:aiagent /opt/ai-agent

# Create log directories
mkdir -p /var/log/ai-agent
chown -R aiagent:aiagent /var/log/ai-agent

# Create systemd service for the application
cat > /etc/systemd/system/ai-agent.service << 'EOF'
[Unit]
Description=AI Agent Platform
After=network.target
After=postgresql.service

[Service]
Type=forking
User=aiagent
Group=aiagent
WorkingDirectory=/opt/ai-agent
Environment=NODE_ENV=production
Environment=AWS_REGION=us-east-1
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
PIDFile=/home/aiagent/.pm2/pm2.pid
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Install CloudWatch agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "namespace": "AI-Agent/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": [
          "tcp_established",
          "tcp_time_wait"
        ],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": [
          "swap_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/ai-agent/*.log",
            "log_group_name": "/aws/ec2/ai-agent/application",
            "log_stream_name": "{instance_id}/application",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/aws/ec2/ai-agent/nginx",
            "log_stream_name": "{instance_id}/access",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/aws/ec2/ai-agent/nginx",
            "log_stream_name": "{instance_id}/error",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Configure Nginx (basic configuration, will be replaced by deployment script)
cat > /etc/nginx/sites-available/ai-agent << 'EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

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

    # Main application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri @backend;
    }

    location @backend {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/ai-agent /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Enable and start nginx
systemctl enable nginx
systemctl start nginx

# Install fail2ban for security
apt-get install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Configure automatic security updates
apt-get install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# Install and configure logrotate for application logs
cat > /etc/logrotate.d/ai-agent << 'EOF'
/var/log/ai-agent/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 aiagent aiagent
    postrotate
        systemctl reload ai-agent
    endscript
}
EOF

# Create swap file for better memory management
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Optimize system settings
cat >> /etc/sysctl.conf << 'EOF'

# AI Agent Platform optimizations
vm.swappiness=10
vm.dirty_ratio=60
vm.dirty_background_ratio=2
net.core.somaxconn=1024
net.core.netdev_max_backlog=5000
net.ipv4.tcp_max_syn_backlog=8192
net.ipv4.tcp_congestion_control=bbr
fs.file-max=65536
EOF

sysctl -p

# Set up log monitoring script
cat > /usr/local/bin/ai-agent-monitor.sh << 'EOF'
#!/bin/bash

# Monitor AI Agent Platform health
LOG_FILE="/var/log/ai-agent/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if application is running
if ! pgrep -f "node.*server/index.ts" > /dev/null; then
    echo "[$DATE] ERROR: AI Agent application is not running" >> $LOG_FILE
    systemctl restart ai-agent
fi

# Check if nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "[$DATE] ERROR: Nginx is not running" >> $LOG_FILE
    systemctl restart nginx
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "[$DATE] WARNING: Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi

# Cleanup old logs
find /var/log/ai-agent -name "*.log" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/ai-agent-monitor.sh

# Add monitoring to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/ai-agent-monitor.sh") | crontab -

# Create deployment directory
mkdir -p /opt/ai-agent/deployment
chown -R aiagent:aiagent /opt/ai-agent

# Final system update
apt-get autoremove -y
apt-get autoclean

# Signal completion
echo "User data script completed successfully at $(date)" > /var/log/user-data-completion.log

# Reboot to ensure all configurations take effect
# shutdown -r +1