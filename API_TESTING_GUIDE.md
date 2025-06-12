# Agent Platform API Testing Guide

## Marketing Campaign Agent API Testing

### Base URL
```
http://your-server:5000/api/v1
```

## Authentication
All API calls require authentication. Use session-based auth or API key:

```bash
# Login first to get session
curl -X POST http://your-server:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

## 1. Create Marketing Campaign Agent

```bash
curl -X POST http://your-server:5000/api/v1/agents \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "name": "Email Marketing Campaign Agent",
    "description": "AI agent specialized in creating and managing email marketing campaigns",
    "category": "marketing",
    "capabilities": [
      "email_campaign_creation",
      "audience_segmentation", 
      "content_personalization",
      "performance_analytics"
    ],
    "config": {
      "model": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 2000,
      "specialization": "email_marketing"
    }
  }'
```

## 2. Execute Marketing Campaign

```bash
curl -X POST http://your-server:5000/api/v1/agents/{agent-id}/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "campaignType": "email",
    "targetAudience": {
      "segment": "premium_customers",
      "demographics": "25-45 age group",
      "interests": ["technology", "productivity"]
    },
    "campaignGoals": [
      "increase_engagement",
      "drive_conversions",
      "boost_retention"
    ],
    "content": {
      "subject": "Unlock Your Productivity Potential",
      "template": "promotional",
      "personalization": true
    },
    "schedule": {
      "sendTime": "2024-06-15T10:00:00Z",
      "timezone": "UTC"
    }
  }'
```

## 3. Create Content Marketing Agent

```bash
curl -X POST http://your-server:5000/api/v1/agents \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "name": "Content Marketing Agent",
    "description": "Generates blog posts, social media content, and marketing copy",
    "category": "marketing",
    "capabilities": [
      "blog_writing",
      "social_media_content",
      "seo_optimization",
      "content_strategy"
    ],
    "config": {
      "model": "gpt-4",
      "temperature": 0.8,
      "tone": "professional",
      "contentTypes": ["blog", "social", "ads"]
    }
  }'
```

## 4. Generate Marketing Content

```bash
curl -X POST http://your-server:5000/api/v1/agents/{agent-id}/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "contentType": "blog_post",
    "topic": "AI Productivity Tools for Small Businesses",
    "targetKeywords": ["AI tools", "productivity", "small business"],
    "wordCount": 1500,
    "tone": "informative",
    "includeCallToAction": true,
    "seoOptimization": true
  }'
```

## 5. Social Media Campaign Agent

```bash
curl -X POST http://your-server:5000/api/v1/agents \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "name": "Social Media Campaign Agent",
    "description": "Manages multi-platform social media campaigns",
    "category": "marketing",
    "capabilities": [
      "multi_platform_posting",
      "hashtag_optimization",
      "engagement_tracking",
      "trend_analysis"
    ],
    "config": {
      "platforms": ["twitter", "linkedin", "facebook"],
      "postingSchedule": "automated",
      "engagementRules": "auto_respond"
    }
  }'
```

## 6. Launch Social Campaign

```bash
curl -X POST http://your-server:5000/api/v1/agents/{agent-id}/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "campaign": {
      "name": "Product Launch Campaign",
      "duration": "7 days",
      "platforms": ["twitter", "linkedin"]
    },
    "content": {
      "theme": "innovation",
      "hashtags": ["#Innovation", "#ProductLaunch", "#Tech"],
      "mediaTypes": ["text", "images", "videos"]
    },
    "schedule": {
      "postsPerDay": 3,
      "optimalTimes": ["09:00", "13:00", "17:00"]
    }
  }'
```

## 7. Lead Generation Agent

```bash
curl -X POST http://your-server:5000/api/v1/agents \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "name": "Lead Generation Agent",
    "description": "Identifies and qualifies potential customers",
    "category": "marketing",
    "capabilities": [
      "prospect_research",
      "lead_scoring",
      "outreach_automation",
      "conversion_tracking"
    ],
    "config": {
      "leadSources": ["website", "social", "referrals"],
      "scoringCriteria": "custom",
      "automationLevel": "high"
    }
  }'
```

## 8. Execute Lead Generation

```bash
curl -X POST http://your-server:5000/api/v1/agents/{agent-id}/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "targetProfile": {
      "industry": "technology",
      "companySize": "50-200 employees",
      "jobTitles": ["CTO", "VP Engineering", "Technical Director"]
    },
    "outreachStrategy": {
      "channels": ["email", "linkedin"],
      "messageTemplate": "personalized",
      "followUpSequence": true
    },
    "qualification": {
      "budget": "$10k+",
      "timeline": "3-6 months",
      "authority": "decision_maker"
    }
  }'
```

## 9. Get Agent Execution Status

```bash
curl -X GET http://your-server:5000/api/v1/agents/{agent-id}/executions/{execution-id} \
  -H "Cookie: session=your-session-id"
```

## 10. Get Campaign Analytics

```bash
curl -X GET http://your-server:5000/api/v1/marketing/campaigns/{campaign-id}/analytics \
  -H "Cookie: session=your-session-id"
```

## 11. List All Marketing Agents

```bash
curl -X GET "http://your-server:5000/api/v1/agents?category=marketing" \
  -H "Cookie: session=your-session-id"
```

## 12. Get Agent Performance Metrics

```bash
curl -X GET http://your-server:5000/api/v1/agents/{agent-id}/metrics \
  -H "Cookie: session=your-session-id"
```

## Advanced Marketing Workflows

### Multi-Agent Campaign Coordination

```bash
# Create campaign workflow with multiple agents
curl -X POST http://your-server:5000/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "name": "Integrated Marketing Campaign",
    "agents": [
      {
        "agentId": "content-agent-id",
        "role": "content_creation",
        "sequence": 1
      },
      {
        "agentId": "social-agent-id", 
        "role": "social_distribution",
        "sequence": 2
      },
      {
        "agentId": "email-agent-id",
        "role": "email_campaign",
        "sequence": 3
      }
    ],
    "trigger": "manual",
    "coordination": "sequential"
  }'
```

### Real-time Campaign Monitoring

```bash
# Get live campaign status
curl -X GET http://your-server:5000/api/v1/marketing/campaigns/live-status \
  -H "Cookie: session=your-session-id"
```

### A/B Testing Campaign

```bash
curl -X POST http://your-server:5000/api/v1/agents/{agent-id}/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-id" \
  -d '{
    "experimentType": "a_b_test",
    "variants": [
      {
        "name": "Variant A",
        "subject": "Limited Time Offer",
        "content": "template_a",
        "audience": "50%"
      },
      {
        "name": "Variant B", 
        "subject": "Exclusive Deal Inside",
        "content": "template_b",
        "audience": "50%"
      }
    ],
    "testDuration": "24 hours",
    "successMetric": "open_rate"
  }'
```

## Error Responses

Common error responses you might encounter:

```json
{
  "error": "Authentication required",
  "code": 401,
  "message": "Please login to access this endpoint"
}
```

```json
{
  "error": "Agent not found",
  "code": 404,
  "message": "Agent with ID {agent-id} does not exist"
}
```

```json
{
  "error": "Validation error",
  "code": 400,
  "message": "Missing required field: campaignType"
}
```

## Health Check

```bash
# Verify API is running
curl -X GET http://your-server:5000/api/v1/marketing/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-06-12T17:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "ai_models": "available",
    "background_jobs": "running"
  }
}
```