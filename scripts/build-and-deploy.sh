#!/bin/bash

# Complete deployment script for agent platform
set -e

# Configuration
REGION=${AWS_REGION:-us-east-1}
ECR_REPO_NAME="agent-platform"
STACK_NAME_ECS="agent-platform-ecs"
STACK_NAME_FRONTEND="agent-platform-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v aws >/dev/null 2>&1 || error "AWS CLI is required but not installed"
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v npm >/dev/null 2>&1 || error "npm is required but not installed"
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || error "AWS credentials not configured"
    
    # Check required environment variables
    [ -z "$DATABASE_URL" ] && error "DATABASE_URL environment variable is required"
    
    log "Prerequisites check passed"
}

# Get AWS account ID and ECR URI
get_aws_info() {
    log "Getting AWS account information..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
    FULL_ECR_URI="${ECR_URI}/${ECR_REPO_NAME}"
    
    log "Account ID: $ACCOUNT_ID"
    log "ECR URI: $ECR_URI"
}

# Create ECR repository if it doesn't exist
create_ecr_repo() {
    log "Checking ECR repository..."
    
    if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION >/dev/null 2>&1; then
        log "Creating ECR repository: $ECR_REPO_NAME"
        aws ecr create-repository \
            --repository-name $ECR_REPO_NAME \
            --region $REGION \
            --image-scanning-configuration scanOnPush=true
    else
        log "ECR repository already exists"
    fi
}

# Build and push Docker image
build_and_push() {
    log "Building Docker image..."
    
    # Build the image
    docker build -t $ECR_REPO_NAME:latest .
    
    # Tag for ECR
    docker tag $ECR_REPO_NAME:latest $FULL_ECR_URI:latest
    docker tag $ECR_REPO_NAME:latest $FULL_ECR_URI:$(date +%Y%m%d-%H%M%S)
    
    log "Logging into ECR..."
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI
    
    log "Pushing image to ECR..."
    docker push $FULL_ECR_URI:latest
    docker push $FULL_ECR_URI:$(date +%Y%m%d-%H%M%S)
    
    log "Docker image pushed successfully"
}

# Deploy ECS infrastructure
deploy_ecs() {
    log "Deploying ECS infrastructure..."
    
    # Prepare parameters
    PARAMETERS="ParameterKey=ImageUri,ParameterValue=$FULL_ECR_URI:latest"
    PARAMETERS="$PARAMETERS ParameterKey=DatabaseUrl,ParameterValue=$DATABASE_URL"
    
    if [ ! -z "$OPENAI_API_KEY" ]; then
        PARAMETERS="$PARAMETERS ParameterKey=OpenAIApiKey,ParameterValue=$OPENAI_API_KEY"
    fi
    
    if [ ! -z "$SESSION_SECRET" ]; then
        PARAMETERS="$PARAMETERS ParameterKey=SessionSecret,ParameterValue=$SESSION_SECRET"
    fi
    
    aws cloudformation deploy \
        --template-file aws/cloudformation-ecs.yaml \
        --stack-name $STACK_NAME_ECS \
        --parameter-overrides $PARAMETERS \
        --capabilities CAPABILITY_IAM \
        --region $REGION
    
    log "ECS deployment completed"
}

# Build frontend
build_frontend() {
    log "Building frontend..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Build frontend
    npm run build:frontend
    
    log "Frontend build completed"
}

# Deploy frontend infrastructure
deploy_frontend() {
    log "Deploying frontend infrastructure..."
    
    # Deploy CloudFormation stack
    aws cloudformation deploy \
        --template-file aws/cloudformation-frontend.yaml \
        --stack-name $STACK_NAME_FRONTEND \
        --capabilities CAPABILITY_IAM \
        --region $REGION
    
    # Get S3 bucket name from stack outputs
    BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME_FRONTEND \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
        --output text)
    
    log "Uploading frontend files to S3: $BUCKET_NAME"
    
    # Upload files to S3
    aws s3 sync client/dist/ s3://$BUCKET_NAME --delete --region $REGION
    
    # Get CloudFront distribution ID
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME_FRONTEND \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text)
    
    if [ ! -z "$DISTRIBUTION_ID" ]; then
        log "Creating CloudFront invalidation..."
        aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*"
    fi
    
    log "Frontend deployment completed"
}

# Get deployment URLs
get_urls() {
    log "Getting deployment URLs..."
    
    # Get ALB URL from ECS stack
    ALB_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME_ECS \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerUrl`].OutputValue' \
        --output text 2>/dev/null || echo "Not available")
    
    # Get CloudFront URL from frontend stack
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME_FRONTEND \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' \
        --output text 2>/dev/null || echo "Not available")
    
    echo
    log "=== DEPLOYMENT COMPLETE ==="
    log "Backend API URL: $ALB_URL"
    log "Frontend URL: $CLOUDFRONT_URL"
    log "Health Check: $ALB_URL/api/health"
    echo
}

# Main deployment function
main() {
    log "Starting deployment process..."
    
    check_prerequisites
    get_aws_info
    create_ecr_repo
    build_and_push
    deploy_ecs
    build_frontend
    deploy_frontend
    get_urls
    
    log "Deployment completed successfully!"
}

# Handle command line arguments
case "${1:-all}" in
    "backend")
        log "Deploying backend only..."
        check_prerequisites
        get_aws_info
        create_ecr_repo
        build_and_push
        deploy_ecs
        ;;
    "frontend")
        log "Deploying frontend only..."
        check_prerequisites
        build_frontend
        deploy_frontend
        ;;
    "all")
        main
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        echo "  backend  - Deploy only the backend (ECS)"
        echo "  frontend - Deploy only the frontend (S3/CloudFront)"
        echo "  all      - Deploy both backend and frontend (default)"
        exit 1
        ;;
esac