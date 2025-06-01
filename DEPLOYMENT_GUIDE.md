# Agent Platform Deployment Guide

This comprehensive guide covers multiple deployment methods for the Agent Platform, from local Mac development to Docker containerization and production deployment.

## Table of Contents

1. [Mac Local Development](#mac-local-development)
2. [Docker Development](#docker-development)
3. [Docker Production](#docker-production)
4. [Cloud Deployment](#cloud-deployment)
5. [Environment Configuration](#environment-configuration)

## Mac Local Development

### Prerequisites

- **Node.js 18+**
- **PostgreSQL 16**
- **Git**

### Setup Steps

1. **Prepare the codebase for Mac:**
   ```bash
   git clone <repository-url>
   cd agent-platform
   
   # Replace Replit-specific configurations
   cp package.local.json package.json
   cp vite.config.local.ts vite.config.ts
   
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb agent_platform
   
   # Verify connection
   psql -d agent_platform -c "SELECT version();"
   ```

3. **Configure environment variables:**
   ```bash
   cat > .env << 'EOF'
   DATABASE_URL=postgresql://username:password@localhost:5432/agent_platform
   OPENAI_API_KEY=your_openai_api_key
   NODE_ENV=development
   
   # Optional for full functionality
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   ANTHROPIC_API_KEY=your_anthropic_key
   EOF
   ```

4. **Initialize database schema:**
   ```bash
   npm run db:push
   ```

5. **Seed with sample data:**
   ```bash
   # Method 1: Direct SQL
   psql -d agent_platform -f server/seed/seed.sql
   
   # Method 2: Node.js script
   npm run seed
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

   Access the platform at:
   - **Frontend:** http://localhost:5000
   - **API:** http://localhost:5000/api
   - **Documentation:** http://localhost:5000/api-docs

## Docker Development

### Single Container Setup

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Copy package files
   COPY package.local.json package.json
   COPY package-lock.json* ./
   
   # Install dependencies
   RUN npm ci --only=production
   
   # Copy application code
   COPY . .
   
   # Copy clean configurations
   COPY vite.config.local.ts vite.config.ts
   
   # Build the application
   RUN npm run build
   
   EXPOSE 5000
   
   CMD ["npm", "start"]
   ```

2. **Build and run:**
   ```bash
   # Build image
   docker build -t agent-platform .
   
   # Run with external PostgreSQL
   docker run -p 5000:5000 \
     -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
     -e OPENAI_API_KEY="your_key" \
     agent-platform
   ```

### Docker Compose Setup

1. **Create docker-compose.yml:**
   ```yaml
   version: '3.8'
   
   services:
     app:
       build:
         context: .
         dockerfile: Dockerfile
       ports:
         - "5000:5000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/agent_platform
         - OPENAI_API_KEY=${OPENAI_API_KEY}
         - NODE_ENV=development
       depends_on:
         - db
       volumes:
         - .:/app
         - /app/node_modules
   
     db:
       image: postgres:16-alpine
       environment:
         - POSTGRES_DB=agent_platform
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
         - ./server/seed/seed.sql:/docker-entrypoint-initdb.d/seed.sql
   
   volumes:
     postgres_data:
   ```

2. **Create development Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Install dependencies for development
   COPY package.local.json package.json
   COPY package-lock.json* ./
   RUN npm ci
   
   # Copy application code
   COPY . .
   COPY vite.config.local.ts vite.config.ts
   
   EXPOSE 5000
   
   CMD ["npm", "run", "dev"]
   ```

3. **Start the stack:**
   ```bash
   # Create .env file for Docker Compose
   echo "OPENAI_API_KEY=your_key_here" > .env
   
   # Start services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f app
   
   # Seed database (if not using init script)
   docker-compose exec app npm run seed
   ```

## Docker Production

### Multi-stage Production Dockerfile

1. **Create production Dockerfile:**
   ```dockerfile
   # Build stage
   FROM node:18-alpine AS builder
   
   WORKDIR /app
   
   # Copy package files
   COPY package.local.json package.json
   COPY package-lock.json* ./
   
   # Install all dependencies
   RUN npm ci
   
   # Copy source code and configs
   COPY . .
   COPY vite.config.local.ts vite.config.ts
   
   # Build the application
   RUN npm run build
   
   # Production stage
   FROM node:18-alpine AS production
   
   # Create non-root user
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nextjs -u 1001
   
   WORKDIR /app
   
   # Copy package files for production install
   COPY package.local.json package.json
   COPY package-lock.json* ./
   
   # Install only production dependencies
   RUN npm ci --only=production && npm cache clean --force
   
   # Copy built application
   COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
   COPY --from=builder --chown=nextjs:nodejs /app/shared ./shared
   COPY --from=builder --chown=nextjs:nodejs /app/server ./server
   
   USER nextjs
   
   EXPOSE 5000
   
   CMD ["npm", "start"]
   ```

2. **Production docker-compose.yml:**
   ```yaml
   version: '3.8'
   
   services:
     app:
       build:
         context: .
         target: production
       ports:
         - "5000:5000"
       environment:
         - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/agent_platform
         - OPENAI_API_KEY=${OPENAI_API_KEY}
         - NODE_ENV=production
       depends_on:
         - db
       restart: unless-stopped
   
     db:
       image: postgres:16-alpine
       environment:
         - POSTGRES_DB=agent_platform
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
         - ./server/seed/seed.sql:/docker-entrypoint-initdb.d/seed.sql
       restart: unless-stopped
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/nginx/ssl
       depends_on:
         - app
       restart: unless-stopped
   
   volumes:
     postgres_data:
   ```

3. **Create nginx.conf:**
   ```nginx
   events {
     worker_connections 1024;
   }
   
   http {
     upstream app {
       server app:5000;
     }
   
     server {
       listen 80;
       server_name your-domain.com;
       
       location / {
         proxy_pass http://app;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       location /ws {
         proxy_pass http://app;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection "upgrade";
         proxy_set_header Host $host;
       }
     }
   }
   ```

## Cloud Deployment

### AWS ECS with Fargate

1. **Create task definition:**
   ```json
   {
     "family": "agent-platform",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "agent-platform",
         "image": "your-account.dkr.ecr.region.amazonaws.com/agent-platform:latest",
         "portMappings": [
           {
             "containerPort": 5000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "DATABASE_URL",
             "valueFrom": "arn:aws:ssm:region:account:parameter/agent-platform/database-url"
           },
           {
             "name": "OPENAI_API_KEY",
             "valueFrom": "arn:aws:ssm:region:account:parameter/agent-platform/openai-key"
           }
         ]
       }
     ]
   }
   ```

2. **Deploy commands:**
   ```bash
   # Build and push to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin account.dkr.ecr.us-east-1.amazonaws.com
   
   docker build -t agent-platform .
   docker tag agent-platform:latest account.dkr.ecr.us-east-1.amazonaws.com/agent-platform:latest
   docker push account.dkr.ecr.us-east-1.amazonaws.com/agent-platform:latest
   
   # Create ECS service
   aws ecs create-service \
     --cluster agent-platform-cluster \
     --service-name agent-platform-service \
     --task-definition agent-platform:1 \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
   ```

### Kubernetes Deployment

1. **Create k8s manifests:**
   ```yaml
   # deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: agent-platform
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: agent-platform
     template:
       metadata:
         labels:
           app: agent-platform
       spec:
         containers:
         - name: agent-platform
           image: your-registry/agent-platform:latest
           ports:
           - containerPort: 5000
           env:
           - name: NODE_ENV
             value: "production"
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: agent-platform-secrets
                 key: database-url
           - name: OPENAI_API_KEY
             valueFrom:
               secretKeyRef:
                 name: agent-platform-secrets
                 key: openai-key
   ---
   # service.yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: agent-platform-service
   spec:
     selector:
       app: agent-platform
     ports:
     - port: 80
       targetPort: 5000
     type: LoadBalancer
   ```

2. **Deploy to cluster:**
   ```bash
   # Create secrets
   kubectl create secret generic agent-platform-secrets \
     --from-literal=database-url="postgresql://..." \
     --from-literal=openai-key="sk-..."
   
   # Deploy application
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   
   # Get external IP
   kubectl get service agent-platform-service
   ```

## Environment Configuration

### Required Environment Variables

```bash
# Core Configuration
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production|development
PORT=5000

# AI Model APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# AWS Services (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=agent-data
CLOUDWATCH_LOG_GROUP=/agent-platform/logs

# Authentication (Optional)
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Monitoring (Optional)
LOG_LEVEL=info|debug|error
ENABLE_METRICS=true|false
```

### Health Checks

The platform includes built-in health check endpoints:

```bash
# Application health
curl http://localhost:5000/health

# Database connectivity
curl http://localhost:5000/api/health/db

# External service status
curl http://localhost:5000/api/health/services
```

### Scaling Considerations

- **Database:** Use connection pooling and read replicas for high traffic
- **Caching:** Consider Redis for session storage and caching
- **File Storage:** Use cloud storage (S3, GCS) instead of local files
- **Monitoring:** Implement proper logging and metrics collection
- **Security:** Use HTTPS, proper authentication, and network security groups

This deployment guide covers all major scenarios from local development to production cloud deployment. Choose the method that best fits your infrastructure requirements.