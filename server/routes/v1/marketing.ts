import { Router } from 'express';
import { BedrockMarketingService } from '../../services/BedrockService';
import { openaiMarketingService } from '../../services/OpenAIService-fixed';

export const marketingRoutes = Router();

// Health check endpoint for versioned API
marketingRoutes.get('/health', (req, res) => {
  res.json({
    success: true,
    version: 'v1',
    service: 'marketing',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /marketing/demo-campaign:
 *   get:
 *     summary: Generate demo marketing campaign using OpenAI
 *     tags: [Marketing v1]
 *     responses:
 *       200:
 *         description: Marketing campaign generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 provider:
 *                   type: string
 *                 model:
 *                   type: string
 *                 campaign:
 *                   type: object
 *                 usage:
 *                   type: object
 */
marketingRoutes.get('/demo-campaign', async (req, res) => {
  try {
    const campaignRequest = {
      clientName: "Spring Break Travel Co",
      targetAudience: "Families with children aged 5-12",
      destination: "Cancun, Mexico",
      travelType: "family",
      months: ["March", "April"],
      starRating: 4,
      propertyCount: 3,
      additionalCriteria: "Focus on beachfront properties with kids clubs and water parks"
    };

    const result = await openaiMarketingService.generateMarketingCampaign(campaignRequest);
    
    res.json({
      success: true,
      provider: "OpenAI",
      model: "gpt-4o-mini",
      campaign: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("OpenAI marketing campaign error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      provider: "OpenAI"
    });
  }
});

/**
 * @swagger
 * /marketing/demo-campaign-bedrock:
 *   get:
 *     summary: Generate demo marketing campaign using AWS Bedrock
 *     tags: [Marketing v1]
 *     responses:
 *       200:
 *         description: Marketing campaign generated successfully
 */
marketingRoutes.get('/demo-campaign-bedrock', async (req, res) => {
  try {
    const bedrockService = new BedrockMarketingService();
    
    const campaignRequest = {
      clientName: "Spring Break Travel Co",
      targetAudience: "Families with children aged 5-12", 
      destination: "Cancun, Mexico",
      travelType: "family",
      months: ["March", "April"],
      starRating: 4,
      propertyCount: 12,
      additionalCriteria: "Focus on beachfront properties with kids clubs and water parks"
    };

    const result = await bedrockService.generateMarketingCampaign(campaignRequest);
    
    res.json({
      success: true,
      provider: "AWS Bedrock",
      model: "claude-3-5-sonnet",
      campaign: result,

      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Bedrock marketing campaign error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      provider: "AWS Bedrock"
    });
  }
});

/**
 * @swagger
 * /marketing/campaigns/generate:
 *   post:
 *     summary: Generate custom marketing campaign
 *     tags: [Marketing v1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientName:
 *                 type: string
 *               targetAudience:
 *                 type: string
 *               destination:
 *                 type: string
 *               travelType:
 *                 type: string
 *               months:
 *                 type: array
 *                 items:
 *                   type: string
 *               starRating:
 *                 type: number
 *               propertyCount:
 *                 type: number
 *               additionalCriteria:
 *                 type: string
 *     responses:
 *       200:
 *         description: Marketing campaign generated successfully
 */
marketingRoutes.post('/campaigns/generate', async (req, res) => {
  try {
    const campaignRequest = req.body;
    
    const campaign = await openaiMarketingService.generateMarketingCampaign(campaignRequest);
    
    res.json({
      success: true,
      campaign
    });
  } catch (error: any) {
    console.error("Marketing campaign generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate marketing campaign",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /marketing/test-openai:
 *   get:
 *     summary: Test OpenAI API connection
 *     tags: [Marketing v1]
 *     responses:
 *       200:
 *         description: Connection test results
 */
marketingRoutes.get('/test-openai', async (req, res) => {
  try {
    const result = await openaiMarketingService.testConnection();
    
    res.json({
      success: true,
      provider: "OpenAI",
      ...result
    });
  } catch (error: any) {
    console.error("OpenAI test error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      provider: "OpenAI"
    });
  }
});

/**
 * @swagger
 * /marketing/test-bedrock:
 *   get:
 *     summary: Test AWS Bedrock API connection
 *     tags: [Marketing v1]
 *     responses:
 *       200:
 *         description: Connection test results
 */
marketingRoutes.get('/test-bedrock', async (req, res) => {
  try {
    const bedrockService = new BedrockMarketingService();
    const result = await bedrockService.testConnection();
    
    res.json({
      success: true,
      provider: "AWS Bedrock",
      result
    });
  } catch (error: any) {
    console.error("Bedrock test error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      provider: "AWS Bedrock"
    });
  }
});