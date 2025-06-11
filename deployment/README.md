# Agent Platform Production Deployment Guide

This guide walks you through deploying the Agent Platform to AWS using ECS for the backend and S3/CloudFront for the frontend.

## Architecture Overview

- **Frontend**: React SPA deployed to S3 and served via CloudFront
- **Backend**: Node.js API containerized and deployed to ECS Fargate
- **Database**: PostgreSQL (RDS or external)
- **Load Balancer**: Application Load Balancer for backend API
- **Secrets**: AWS Systems Manager Parameter Store

## Prerequisites

1. AWS CLI installed and configured
2. Docker installed
3. Node.js 20+ installed
4. Valid AWS account with appropriate permissions

## Deployment Steps

### 1. Prepare Environment Variables

Update `aws/ecs-parameters.json` with your actual values:

```json
[
  {
    "ParameterKey": "VpcId",
    "ParameterValue": "vpc-your-vpc-id"
  },
  {
    "ParameterKey": "SubnetIds", 
    "ParameterValue": "subnet-12345,subnet-67890"
  },
  {
    "ParameterKey": "DatabaseUrl",
    "ParameterValue": "postgresql://user:pass@host:5432/dbname"
  },
  {
    "ParameterKey": "OpenAIApiKey",
    "ParameterValue": "sk-your-openai-key"
  },
  {
    "ParameterKey": "SessionSecret",
    "ParameterValue": "your-session-secret"
  }
]
```

### 2. Run Deployment Script

```bash
# Make script executable
chmod +x scripts/build-and-deploy.sh

# Deploy to production
./scripts/build-and-deploy.sh production
```

### 3. Manual Steps (if needed)

#### Build and Push Docker Image

```bash
# Build the image
docker build -t agent-platform-backend:latest .

# Create ECR repository
aws ecr create-repository --repository-name agent-platform-backend

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag agent-platform-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agent-platform-backend:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agent-platform-backend:latest
```

#### Deploy Infrastructure

```bash
# Deploy ECS infrastructure
aws cloudformation create-stack \
  --stack-name agent-platform-ecs \
  --template-body file://aws/cloudformation-ecs.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters file://aws/ecs-parameters.json

# Deploy frontend infrastructure
aws cloudformation create-stack \
  --stack-name agent-platform-frontend \
  --template-body file://aws/cloudformation-frontend.yaml \
  --parameters ParameterKey=BackendUrl,ParameterValue=YOUR_ALB_DNS
```

#### Build and Deploy Frontend

```bash
# Build frontend
cd client
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-frontend-bucket --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Configuration

### Environment Variables

The backend requires these environment variables in production:

- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Session encryption key

### Health Checks

The backend includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-11T18:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

## Monitoring

### CloudWatch Logs

- ECS logs are sent to CloudWatch group: `/ecs/agent-platform-backend`
- Frontend logs are available in CloudFront access logs

### Health Monitoring

- ALB health checks monitor the `/api/health` endpoint
- ECS service will restart unhealthy containers automatically

## Scaling

### Backend Scaling

Modify the ECS service desired count in the CloudFormation template:

```yaml
ECSService:
  Properties:
    DesiredCount: 3  # Increase for more instances
```

### Frontend Scaling

CloudFront automatically scales globally. No configuration needed.

## Security

### HTTPS

- Frontend uses CloudFront with AWS-managed SSL certificates
- Backend ALB can be configured with ACM certificates

### CORS

The backend is configured to allow cross-origin requests. Update CORS settings in production as needed.

### Secrets Management

All sensitive data is stored in AWS Systems Manager Parameter Store with encryption.

## Troubleshooting

### Common Issues

1. **ECS Task Fails to Start**
   - Check CloudWatch logs for container errors
   - Verify environment variables and secrets
   - Ensure database connectivity

2. **Frontend Not Loading**
   - Check S3 bucket policy and CloudFront distribution
   - Verify API endpoint configuration
   - Check browser console for CORS errors

3. **Database Connection Issues**
   - Verify security groups allow ECS to database access
   - Check database credentials in Parameter Store
   - Ensure database is accessible from ECS subnets

### Debugging Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster agent-platform-cluster --services agent-platform-service

# View CloudWatch logs
aws logs tail /ecs/agent-platform-backend --follow

# Test health endpoint
curl https://your-alb-dns/api/health

# Check CloudFront distribution
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID
```

## Cost Optimization

- Use FARGATE_SPOT for non-critical environments
- Configure CloudFront caching policies appropriately
- Set up CloudWatch alarms for cost monitoring
- Use Reserved Instances for predictable workloads

## Maintenance

### Updates

1. Build and push new Docker image
2. Update ECS service to use new image
3. ECS performs rolling deployment automatically

### Backups

- Database backups (RDS automated backups)
- S3 versioning for frontend assets
- Parameter Store values should be documented

## Support

For deployment issues:
1. Check CloudWatch logs first
2. Verify all parameters are correctly configured
3. Test individual components (health check, database connection)
4. Review AWS service limits and quotas