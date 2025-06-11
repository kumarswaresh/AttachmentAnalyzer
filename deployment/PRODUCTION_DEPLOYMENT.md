# Production Deployment Guide

## Architecture Overview

The agent platform uses a containerized backend deployed on AWS ECS with a static frontend served from S3/CloudFront.

### Backend (ECS)
- Dockerized Express.js API server
- PostgreSQL database (RDS recommended)
- Auto-scaling ECS service
- Load balancer with health checks

### Frontend (S3/CloudFront)
- Static React build served from S3
- CloudFront CDN for global distribution
- Custom domain support

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. Docker installed locally
3. PostgreSQL database provisioned (RDS recommended)
4. Environment variables configured

## Environment Variables

### Required Production Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# API Keys (if using AI features)
OPENAI_API_KEY=sk-...

# Security
SESSION_SECRET=your-secure-session-secret

# AWS (for parameter store)
AWS_REGION=us-east-1
```

## Deployment Steps

### 1. Backend Deployment (ECS)

#### Build and Push Docker Image
```bash
# Build the image
docker build -t agent-platform-backend .

# Tag for ECR
docker tag agent-platform-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/agent-platform:latest

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/agent-platform:latest
```

#### Deploy CloudFormation Stack
```bash
# Deploy ECS infrastructure
aws cloudformation deploy \
  --template-file aws/cloudformation-ecs.yaml \
  --stack-name agent-platform-ecs \
  --parameter-overrides \
    DatabaseUrl=$DATABASE_URL \
    OpenAIApiKey=$OPENAI_API_KEY \
    SessionSecret=$SESSION_SECRET \
  --capabilities CAPABILITY_IAM
```

### 2. Frontend Deployment (S3/CloudFront)

#### Build Frontend
```bash
# Build the React application
npm run build:frontend
```

#### Deploy to S3/CloudFront
```bash
# Deploy frontend infrastructure
aws cloudformation deploy \
  --template-file aws/cloudformation-frontend.yaml \
  --stack-name agent-platform-frontend \
  --parameter-overrides \
    DomainName=yourdomain.com \
  --capabilities CAPABILITY_IAM

# Upload build files to S3
aws s3 sync client/dist/ s3://your-frontend-bucket --delete
```

## Health Checks

The backend includes health check endpoints:

- `/api/health` - Basic health check
- `/api/health/detailed` - Detailed system status

## Monitoring

### CloudWatch Metrics
- ECS service metrics
- Application logs
- Database connections
- API response times

### Alarms
- High CPU usage
- Memory utilization
- Failed health checks
- Database connectivity

## Scaling

### Auto Scaling Configuration
```yaml
# ECS Service Auto Scaling
MinCapacity: 2
MaxCapacity: 10
TargetCPUUtilization: 70%
```

## Security

### Network Security
- Private subnets for ECS tasks
- Security groups restrict access
- ALB handles public traffic

### Data Security
- Environment variables via Parameter Store
- Database credentials encrypted
- TLS/SSL termination at load balancer

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Verify DATABASE_URL format
   - Check security group rules
   - Ensure database is accessible from ECS

2. **Health Check Failures**
   - Review application logs in CloudWatch
   - Verify port configuration (5000)
   - Check task definition memory/CPU limits

3. **Frontend 404 Errors**
   - Ensure S3 bucket is public readable
   - Verify CloudFront distribution settings
   - Check index.html exists in S3

### Log Access
```bash
# View ECS logs
aws logs describe-log-streams --log-group-name /ecs/agent-platform

# Tail recent logs
aws logs tail /ecs/agent-platform --follow
```

## Cost Optimization

1. **Right-size ECS tasks** - Monitor CPU/memory usage
2. **Use Spot instances** - For non-critical workloads
3. **S3 lifecycle policies** - Archive old logs
4. **CloudFront caching** - Optimize cache headers

## Backup Strategy

### Database Backups
- RDS automated backups (7-day retention)
- Point-in-time recovery
- Cross-region backup replication

### Application Data
- Regular exports of critical data
- Version control for configuration

## Rollback Procedures

### Backend Rollback
```bash
# Revert to previous task definition
aws ecs update-service \
  --cluster agent-platform \
  --service agent-platform-service \
  --task-definition agent-platform:PREVIOUS_REVISION
```

### Frontend Rollback
```bash
# Restore previous S3 version
aws s3 sync s3://backup-bucket/previous-version/ s3://frontend-bucket/ --delete
```

## Performance Tuning

### Database Optimization
- Connection pooling (configured in app)
- Read replicas for heavy read workloads
- Database query optimization

### Application Optimization
- Express.js compression enabled
- Static asset caching
- Database query optimization

## Compliance & Auditing

### Logging Requirements
- All API requests logged
- User authentication events
- Database access logs
- Error tracking and alerting

### Data Retention
- Application logs: 30 days
- Database backups: 7 days
- Audit logs: 1 year