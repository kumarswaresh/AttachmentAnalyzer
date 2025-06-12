# AWS Deployment Instructions

## Quick Start Guide

### 1. Ubuntu AMI Selection
**Recommended: Ubuntu 22.04 LTS**
- AMI ID: `ami-0c7217cdde317cfec` (us-east-1)
- Instance Type: `t3.medium` (minimum) or `t3.large` (recommended)
- Storage: 20GB GP2 (minimum)

### 2. AWS Services Required

#### Core Infrastructure:
- **EC2**: Ubuntu 22.04 LTS instance
- **RDS**: PostgreSQL 14.9 (db.t3.micro for dev, db.t3.small+ for prod)
- **ALB**: Application Load Balancer for SSL termination
- **VPC**: Custom VPC with public/private subnets

#### AI Services:
- **AWS Bedrock**: Enable Claude 3.5 Sonnet model access
- **Parameter Store**: Secure credential storage

#### Supporting Services:
- **CloudWatch**: Monitoring and logging
- **Route 53**: DNS management (if using custom domain)
- **Certificate Manager**: SSL certificates

### 3. One-Click Deployment

#### Option A: CloudFormation Stack
```bash
aws cloudformation create-stack \
  --stack-name ai-agent-platform \
  --template-body file://deployment/cloudformation-template.yml \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=your-key-pair \
    ParameterKey=DatabasePassword,ParameterValue=YourSecurePassword123! \
    ParameterKey=OpenAIAPIKey,ParameterValue=your-openai-key \
    ParameterKey=AnthropicAPIKey,ParameterValue=your-anthropic-key \
  --capabilities CAPABILITY_NAMED_IAM
```

#### Option B: Manual Setup
1. Launch EC2 instance with user-data script
2. Configure RDS PostgreSQL database
3. Set up Application Load Balancer
4. Configure security groups and IAM roles

### 4. Instance Configuration

#### EC2 Launch Command:
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --count 1 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --associate-public-ip-address \
  --iam-instance-profile Name=AI-Agent-Instance-Profile \
  --user-data file://deployment/user-data.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ai-agent-app}]'
```

#### User Data Script:
The `user-data.sh` script automatically installs:
- Node.js 20
- PM2 process manager
- Nginx web server
- AWS CLI v2
- CloudWatch agent
- PostgreSQL client
- Security tools (fail2ban)

### 5. Database Setup

#### RDS PostgreSQL Configuration:
```bash
aws rds create-db-instance \
  --db-instance-identifier ai-agent-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.9 \
  --master-username aiagentadmin \
  --master-user-password "YourSecurePassword123!" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name ai-agent-db-subnet-group \
  --backup-retention-period 7 \
  --storage-encrypted
```

### 6. AWS Bedrock Setup

#### Enable Model Access:
1. Go to AWS Bedrock console
2. Navigate to "Model access" → "Enable specific models"
3. Enable "Claude 3.5 Sonnet" by Anthropic
4. Submit request (usually approved within minutes)

#### IAM Permissions Required:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    }
  ]
}
```

### 7. Environment Variables (Parameter Store)

#### Required Parameters:
```bash
# Database connection
aws ssm put-parameter \
  --name "/ai-agent/production/DATABASE_URL" \
  --value "postgresql://aiagentadmin:password@rds-endpoint:5432/postgres" \
  --type "SecureString"

# AI API Keys
aws ssm put-parameter \
  --name "/ai-agent/production/OPENAI_API_KEY" \
  --value "your-openai-api-key" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/ai-agent/production/ANTHROPIC_API_KEY" \
  --value "your-anthropic-api-key" \
  --type "SecureString"

# Session security
aws ssm put-parameter \
  --name "/ai-agent/production/SESSION_SECRET" \
  --value "$(openssl rand -base64 32)" \
  --type "SecureString"
```

### 8. Deployment Process

#### SSH to Instance:
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### Run Deployment:
```bash
# Switch to application user
sudo su - aiagent

# Clone repository (update with your repo URL)
git clone https://github.com/your-username/ai-agent-platform.git /opt/ai-agent
cd /opt/ai-agent

# Make scripts executable
chmod +x deployment/*.sh

# Run deployment
./deployment/deploy.sh --repo https://github.com/your-username/ai-agent-platform.git
```

#### Setup SSL (Optional):
```bash
sudo ./deployment/setup-ssl.sh --domain yourdomain.com --email admin@yourdomain.com
```

### 9. Load Balancer Configuration

#### Create Target Group:
```bash
aws elbv2 create-target-group \
  --name ai-agent-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxxxxxxxx \
  --health-check-path /health \
  --health-check-interval-seconds 30
```

#### Create Application Load Balancer:
```bash
aws elbv2 create-load-balancer \
  --name ai-agent-alb \
  --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
  --security-groups sg-xxxxxxxxx \
  --scheme internet-facing
```

#### Register EC2 Instance:
```bash
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/ai-agent-tg/id \
  --targets Id=i-xxxxxxxxx
```

### 10. Security Configuration

#### Security Groups:
- **ALB Security Group**: Allow 80/443 from 0.0.0.0/0
- **EC2 Security Group**: Allow 22 from your IP, 80/5000 from ALB
- **RDS Security Group**: Allow 5432 from EC2 only

#### SSL/TLS Setup:
- Use AWS Certificate Manager for SSL certificates
- Configure Nginx with strong SSL settings
- Enable HSTS and security headers

### 11. Monitoring Setup

#### CloudWatch Dashboards:
- Application performance metrics
- Infrastructure monitoring
- Log aggregation

#### Alerts:
- High CPU/memory usage
- Application errors
- Database connection issues

### 12. Cost Optimization

#### Development Environment (~$66/month):
- EC2 t3.medium: $30
- RDS db.t3.micro: $13
- ALB: $18
- Data transfer: $5

#### Production Environment (~$118/month):
- EC2 t3.large: $60
- RDS db.t3.small: $25
- ALB: $18
- Monitoring: $5
- Data transfer: $10

### 13. Backup Strategy

#### Automated Backups:
- RDS automated backups (7-day retention)
- Daily snapshots of EBS volumes
- Application code backup to S3

#### Disaster Recovery:
- Multi-AZ RDS deployment for production
- Auto Scaling Group for high availability
- Infrastructure as Code for quick rebuild

### 14. Maintenance

#### Regular Tasks:
- Security updates via unattended-upgrades
- Certificate renewal (automated)
- Database maintenance windows
- Application log rotation

#### Monitoring Commands:
```bash
# Check application status
pm2 status
pm2 logs

# Check Nginx status
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h

# View application logs
tail -f /var/log/ai-agent/combined.log
```

### 15. Troubleshooting

#### Common Issues:
1. **Bedrock Access Denied**: Verify model access in Bedrock console
2. **Database Connection**: Check security groups and connection string
3. **SSL Issues**: Verify DNS records and certificate validation
4. **High Memory Usage**: Consider upgrading instance or adding swap

#### Log Locations:
- Application: `/var/log/ai-agent/`
- Nginx: `/var/log/nginx/`
- System: `/var/log/syslog`
- PM2: `~/.pm2/logs/`

### 16. Scaling Considerations

#### Horizontal Scaling:
- Auto Scaling Group with multiple instances
- Application Load Balancer distribution
- Session store in Redis/ElastiCache

#### Vertical Scaling:
- Upgrade EC2 instance types
- Increase RDS instance class
- Add read replicas for database

### 17. Security Best Practices

#### Access Control:
- Use IAM roles instead of access keys
- Implement least privilege principle
- Regular security audits

#### Network Security:
- Private subnets for databases
- VPC flow logs for monitoring
- WAF for web application protection

### 18. API Keys Required

You'll need to obtain these API keys before deployment:

#### OpenAI:
1. Visit https://platform.openai.com/api-keys
2. Create new API key
3. Store in Parameter Store

#### Anthropic:
1. Visit https://console.anthropic.com/
2. Generate API key
3. Store in Parameter Store

#### AWS Services:
- No additional keys needed (uses IAM roles)
- Ensure Bedrock model access is enabled

This deployment guide provides everything needed to run the AI Agent Platform on AWS with production-grade security, monitoring, and scalability.