#!/bin/bash

# Build and Deploy Agent Platform to AWS
# Usage: ./scripts/build-and-deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Starting deployment for environment: $ENVIRONMENT"
echo "📍 AWS Region: $AWS_REGION"
echo "🔢 AWS Account ID: $AWS_ACCOUNT_ID"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Build frontend
echo "📦 Building frontend..."
cd client
npm run build
cd ..
print_status "Frontend built successfully"

# Step 2: Build backend Docker image
echo "🐳 Building Docker image..."
docker build -t agent-platform-backend:latest .
print_status "Docker image built successfully"

# Step 3: Create ECR repository if it doesn't exist
echo "🏗️ Creating ECR repository..."
aws ecr describe-repositories --repository-names agent-platform-backend --region $AWS_REGION 2>/dev/null || \
aws ecr create-repository --repository-name agent-platform-backend --region $AWS_REGION
print_status "ECR repository ready"

# Step 4: Login to ECR and push image
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "🏷️ Tagging and pushing Docker image..."
docker tag agent-platform-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/agent-platform-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/agent-platform-backend:latest
print_status "Docker image pushed to ECR"

# Step 5: Deploy infrastructure if CloudFormation stacks don't exist
echo "🏗️ Deploying infrastructure..."

# Check if ECS stack exists
if aws cloudformation describe-stacks --stack-name agent-platform-ecs --region $AWS_REGION 2>/dev/null; then
    print_warning "ECS stack already exists, updating..."
    aws cloudformation update-stack \
        --stack-name agent-platform-ecs \
        --template-body file://aws/cloudformation-ecs.yaml \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION \
        --parameters file://aws/ecs-parameters.json
else
    print_warning "Creating new ECS stack..."
    aws cloudformation create-stack \
        --stack-name agent-platform-ecs \
        --template-body file://aws/cloudformation-ecs.yaml \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION \
        --parameters file://aws/ecs-parameters.json
fi

# Wait for ECS stack to complete
echo "⏳ Waiting for ECS stack deployment..."
aws cloudformation wait stack-create-complete --stack-name agent-platform-ecs --region $AWS_REGION || \
aws cloudformation wait stack-update-complete --stack-name agent-platform-ecs --region $AWS_REGION
print_status "ECS infrastructure deployed"

# Get ALB DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name agent-platform-ecs \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text)

echo "🔗 ALB DNS: $ALB_DNS"

# Step 6: Deploy frontend infrastructure
echo "🌐 Deploying frontend infrastructure..."

# Create frontend parameters file
cat > aws/frontend-parameters.json << EOF
[
    {
        "ParameterKey": "BackendUrl",
        "ParameterValue": "$ALB_DNS"
    }
]
EOF

# Check if frontend stack exists
if aws cloudformation describe-stacks --stack-name agent-platform-frontend --region $AWS_REGION 2>/dev/null; then
    print_warning "Frontend stack already exists, updating..."
    aws cloudformation update-stack \
        --stack-name agent-platform-frontend \
        --template-body file://aws/cloudformation-frontend.yaml \
        --region $AWS_REGION \
        --parameters file://aws/frontend-parameters.json
else
    print_warning "Creating new frontend stack..."
    aws cloudformation create-stack \
        --stack-name agent-platform-frontend \
        --template-body file://aws/cloudformation-frontend.yaml \
        --region $AWS_REGION \
        --parameters file://aws/frontend-parameters.json
fi

# Wait for frontend stack to complete
echo "⏳ Waiting for frontend stack deployment..."
aws cloudformation wait stack-create-complete --stack-name agent-platform-frontend --region $AWS_REGION || \
aws cloudformation wait stack-update-complete --stack-name agent-platform-frontend --region $AWS_REGION
print_status "Frontend infrastructure deployed"

# Step 7: Upload frontend files to S3
S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name agent-platform-frontend \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
    --output text)

echo "📤 Uploading frontend to S3 bucket: $S3_BUCKET"
aws s3 sync client/dist/ s3://$S3_BUCKET --delete --region $AWS_REGION
print_status "Frontend files uploaded to S3"

# Step 8: Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name agent-platform-frontend \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text)

echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --region $AWS_REGION
print_status "CloudFront cache invalidated"

# Step 9: Get website URL
WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name agent-platform-frontend \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' \
    --output text)

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   Backend API: http://$ALB_DNS"
echo "   Frontend URL: $WEBSITE_URL"
echo "   S3 Bucket: $S3_BUCKET"
echo "   CloudFront Distribution: $DISTRIBUTION_ID"
echo ""
echo "🔧 Next steps:"
echo "   1. Configure your domain DNS to point to the CloudFront distribution"
echo "   2. Set up SSL certificate in ACM for HTTPS"
echo "   3. Update frontend parameters with custom domain"
echo ""
print_status "All systems deployed and ready!"