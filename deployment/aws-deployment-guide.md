# AWS EC2 Deployment Guide for AI Agent Platform

## Overview
This guide provides step-by-step instructions for deploying the AI Agent Platform on AWS using EC2, RDS PostgreSQL, Bedrock, and other AWS services.

## Architecture Overview
```
Internet Gateway
    ↓
Application Load Balancer (ALB)
    ↓
EC2 Instance (Ubuntu 22.04 LTS)
├── Nginx (Reverse Proxy)
├── Node.js 20 Application
└── PM2 Process Manager
    ↓
AWS RDS PostgreSQL
AWS Bedrock (Claude 3.5 Sonnet)
AWS Parameter Store (Secrets)
```

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured locally
- Domain name (optional, but recommended)

## Step 1: Choose AWS Services and Configuration

### Recommended AWS Services:
1. **EC2 Instance**: t3.medium or t3.large (minimum 2 vCPU, 4GB RAM)
2. **RDS PostgreSQL**: db.t3.micro for development, db.t3.small+ for production
3. **Application Load Balancer**: For SSL termination and load distribution
4. **AWS Bedrock**: For Claude 3.5 Sonnet API access
5. **AWS Parameter Store**: For secure credential management
6. **CloudWatch**: For monitoring and logging
7. **VPC**: Custom VPC with public/private subnets

### Recommended Ubuntu Version:
**Ubuntu 22.04 LTS (Jammy Jellyfish)**
- AMI ID: ami-0c7217cdde317cfec (us-east-1)
- Long-term support until 2027
- Native support for Node.js 20
- Excellent compatibility with our tech stack

## Step 2: AWS Infrastructure Setup

### Create VPC and Networking
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=ai-agent-vpc}]'

# Create Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=ai-agent-igw}]'

# Create Subnets
aws ec2 create-subnet --vpc-id vpc-xxxxxxxxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ai-agent-public-1a}]'
aws ec2 create-subnet --vpc-id vpc-xxxxxxxxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ai-agent-public-1b}]'
aws ec2 create-subnet --vpc-id vpc-xxxxxxxxx --cidr-block 10.0.3.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ai-agent-private-1a}]'
aws ec2 create-subnet --vpc-id vpc-xxxxxxxxx --cidr-block 10.0.4.0/24 --availability-zone us-east-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ai-agent-private-1b}]'
```

### Create Security Groups
```bash
# Application Security Group
aws ec2 create-security-group \
  --group-name ai-agent-app-sg \
  --description "Security group for AI Agent application" \
  --vpc-id vpc-xxxxxxxxx

# Database Security Group
aws ec2 create-security-group \
  --group-name ai-agent-db-sg \
  --description "Security group for AI Agent database" \
  --vpc-id vpc-xxxxxxxxx

# Load Balancer Security Group
aws ec2 create-security-group \
  --group-name ai-agent-alb-sg \
  --description "Security group for AI Agent load balancer" \
  --vpc-id vpc-xxxxxxxxx
```

## Step 3: RDS PostgreSQL Setup

### Create DB Subnet Group
```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name ai-agent-db-subnet-group \
  --db-subnet-group-description "Subnet group for AI Agent database" \
  --subnet-ids subnet-xxxxxxxxx subnet-yyyyyyyyy
```

### Create RDS Instance
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
  --multi-az \
  --storage-encrypted \
  --tags Key=Name,Value=ai-agent-postgres
```

## Step 4: EC2 Instance Configuration

### Launch EC2 Instance
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --count 1 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ai-agent-app}]' \
  --user-data file://deployment/user-data.sh
```

### User Data Script (user-data.sh)
See the separate user-data.sh file for the complete server setup script.

## Step 5: Application Load Balancer Setup

### Create Target Group
```bash
aws elbv2 create-target-group \
  --name ai-agent-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxxxxxxxx \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3
```

### Create Application Load Balancer
```bash
aws elbv2 create-load-balancer \
  --name ai-agent-alb \
  --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
  --security-groups sg-xxxxxxxxx \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4
```

## Step 6: SSL Certificate (Optional but Recommended)

### Request SSL Certificate via ACM
```bash
aws acm request-certificate \
  --domain-name yourdomain.com \
  --domain-name *.yourdomain.com \
  --validation-method DNS \
  --subject-alternative-names www.yourdomain.com
```

## Step 7: Environment Configuration

### AWS Parameter Store Setup
```bash
# Database URL
aws ssm put-parameter \
  --name "/ai-agent/production/DATABASE_URL" \
  --value "postgresql://aiagentadmin:YourSecurePassword123!@your-rds-endpoint:5432/aiagent" \
  --type "SecureString" \
  --tier "Standard"

# OpenAI API Key
aws ssm put-parameter \
  --name "/ai-agent/production/OPENAI_API_KEY" \
  --value "your-openai-api-key" \
  --type "SecureString" \
  --tier "Standard"

# Anthropic API Key
aws ssm put-parameter \
  --name "/ai-agent/production/ANTHROPIC_API_KEY" \
  --value "your-anthropic-api-key" \
  --type "SecureString" \
  --tier "Standard"

# Session Secret
aws ssm put-parameter \
  --name "/ai-agent/production/SESSION_SECRET" \
  --value "$(openssl rand -base64 32)" \
  --type "SecureString" \
  --tier "Standard"
```

## Step 8: Enable AWS Bedrock Access

### Enable Bedrock Models in AWS Console
1. Navigate to AWS Bedrock console
2. Go to "Model access" in the left sidebar
3. Click "Enable specific models"
4. Enable "Claude 3.5 Sonnet" by Anthropic
5. Submit the request (may take a few minutes to approve)

### Create IAM Role for Bedrock Access
```bash
# Create trust policy
cat > bedrock-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name AI-Agent-Bedrock-Role \
  --assume-role-policy-document file://bedrock-trust-policy.json

# Create and attach policy
cat > bedrock-policy.json << EOF
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
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/ai-agent/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name AI-Agent-Bedrock-Role \
  --policy-name BedrockAccess \
  --policy-document file://bedrock-policy.json

# Create instance profile
aws iam create-instance-profile --instance-profile-name AI-Agent-Instance-Profile
aws iam add-role-to-instance-profile \
  --instance-profile-name AI-Agent-Instance-Profile \
  --role-name AI-Agent-Bedrock-Role
```

## Step 9: Security Configuration

### Security Group Rules
```bash
# ALB Security Group (Allow HTTP/HTTPS from internet)
aws ec2 authorize-security-group-ingress \
  --group-id sg-alb-xxxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-alb-xxxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# App Security Group (Allow ALB traffic and SSH)
aws ec2 authorize-security-group-ingress \
  --group-id sg-app-xxxxxxxxx \
  --protocol tcp \
  --port 80 \
  --source-group sg-alb-xxxxxxxxx

aws ec2 authorize-security-group-ingress \
  --group-id sg-app-xxxxxxxxx \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

# DB Security Group (Allow app traffic only)
aws ec2 authorize-security-group-ingress \
  --group-id sg-db-xxxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --source-group sg-app-xxxxxxxxx
```

## Step 10: Monitoring and Logging

### CloudWatch Log Groups
```bash
aws logs create-log-group --log-group-name /aws/ec2/ai-agent/application
aws logs create-log-group --log-group-name /aws/ec2/ai-agent/nginx
aws logs create-log-group --log-group-name /aws/ec2/ai-agent/system
```

## Step 11: Deployment Process

### Manual Deployment Steps
1. SSH into your EC2 instance
2. Run the deployment script: `./deployment/deploy.sh`
3. Configure Nginx with the provided configuration
4. Start the application with PM2
5. Configure SSL certificate (if using custom domain)

### Automated Deployment
Use the provided deployment scripts in the `deployment/` directory:
- `deploy.sh` - Main deployment script
- `nginx.conf` - Nginx configuration
- `ecosystem.config.js` - PM2 configuration
- `setup-ssl.sh` - SSL certificate setup

## Cost Estimation (Monthly)

### Development Environment:
- EC2 t3.medium: ~$30
- RDS db.t3.micro: ~$13
- ALB: ~$18
- Data Transfer: ~$5
- **Total: ~$66/month**

### Production Environment:
- EC2 t3.large: ~$60
- RDS db.t3.small: ~$25
- ALB: ~$18
- CloudWatch: ~$5
- Data Transfer: ~$10
- **Total: ~$118/month**

*Note: Costs may vary based on usage, region, and additional services.*

## Troubleshooting

### Common Issues:
1. **Bedrock Access Denied**: Ensure models are enabled in Bedrock console
2. **Database Connection Issues**: Check security groups and RDS endpoint
3. **SSL Certificate Issues**: Verify DNS records for domain validation
4. **High CPU Usage**: Consider upgrading EC2 instance type
5. **Memory Issues**: Enable swap or upgrade instance

### Log Locations:
- Application Logs: `/var/log/ai-agent/`
- Nginx Logs: `/var/log/nginx/`
- System Logs: `/var/log/syslog`
- PM2 Logs: `~/.pm2/logs/`

## Backup and Disaster Recovery

### Automated Backups:
- RDS automated backups (7-day retention)
- Daily application data backup to S3
- Weekly full system snapshot

### Recovery Procedures:
1. Database restore from RDS backup
2. Application restore from S3 backup
3. Infrastructure restore from CloudFormation template

For detailed implementation, see the accompanying scripts in the `deployment/` directory.