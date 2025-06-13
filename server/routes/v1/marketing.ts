import { Router } from 'express';
import { BedrockMarketingService } from '../../services/BedrockService';
import { openaiMarketingService } from '../../services/OpenAIService-fixed';
import OpenAI from 'openai';

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
 * /marketing/hotel-recommendations:
 *   post:
 *     summary: Generate hotel recommendations for marketing campaigns
 *     tags: [Marketing v1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               destination:
 *                 type: string
 *                 example: "Cancun, Mexico"
 *               travelType:
 *                 type: string
 *                 example: "family"
 *               starRating:
 *                 type: number
 *                 example: 4
 *               propertyCount:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Hotel recommendations generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   countryCode:
 *                     type: string
 *                   countryName:
 *                     type: string
 *                   stateCode:
 *                     type: string
 *                   state:
 *                     type: string
 *                   cityCode:
 *                     type: number
 *                   cityName:
 *                     type: string
 *                   code:
 *                     type: number
 *                   name:
 *                     type: string
 *                   rating:
 *                     type: number
 *                   description:
 *                     type: string
 *                   imageUrl:
 *                     type: string
 */
marketingRoutes.post('/hotel-recommendations', async (req, res) => {
  try {
    const { destination = "Cancun, Mexico", travelType = "family", starRating = 4, propertyCount = 5 } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OpenAI API key not configured. Please provide OPENAI_API_KEY in environment variables."
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15000, // 15 second timeout
    });

    const prompt = `Generate ${propertyCount} authentic hotel recommendations for ${destination}:
- Travel type: ${travelType}
- Minimum star rating: ${starRating}

Return ONLY a JSON array in this exact format:
[{
  "countryCode": "US",
  "countryName": "United States", 
  "stateCode": "NY",
  "state": "New York",
  "cityCode": 1,
  "cityName": "New York",
  "code": 101,
  "name": "Hotel Name",
  "rating": 4.5,
  "description": "Hotel description",
  "imageUrl": "https://example.com/images/hotel-name.jpg"
}]

Use real hotels from ${destination}. No markdown, no text, only JSON array.`;

    console.log(`Generating hotel recommendations for ${destination}`);
    
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4.1-nano-2025-04-14",
        messages: [
          {
            role: "system",
            content: "You are a travel expert. Return only valid JSON array with hotel data. No markdown or extra text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout after 15 seconds')), 15000)
      )
    ]);

    const aiResponse = response.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error("Empty response from OpenAI API");
    }
    
    try {
      // Parse the AI response as JSON
      const hotelRecommendations = JSON.parse(aiResponse);
      
      // Validate that it's an array
      if (!Array.isArray(hotelRecommendations)) {
        throw new Error("Response is not an array");
      }
      
      // Validate required fields for each hotel
      const validatedHotels = hotelRecommendations.map((hotel, index) => {
        const requiredFields = ['countryCode', 'countryName', 'stateCode', 'state', 'cityCode', 'cityName', 'code', 'name', 'rating', 'description', 'imageUrl'];
        
        for (const field of requiredFields) {
          if (!(field in hotel)) {
            throw new Error(`Missing required field '${field}' in hotel ${index + 1}`);
          }
        }
        
        return {
          countryCode: String(hotel.countryCode),
          countryName: String(hotel.countryName),
          stateCode: String(hotel.stateCode),
          state: String(hotel.state),
          cityCode: Number(hotel.cityCode),
          cityName: String(hotel.cityName),
          code: Number(hotel.code),
          name: String(hotel.name),
          rating: Number(hotel.rating),
          description: String(hotel.description),
          imageUrl: String(hotel.imageUrl)
        };
      });
      
      res.json(validatedHotels);
      
    } catch (parseError: any) {
      console.error("Error parsing AI response:", parseError);
      res.status(500).json({
        success: false,
        error: "Failed to parse AI-generated hotel recommendations",
        details: parseError?.message || "Unknown parsing error"
      });
    }
    
  } catch (error: any) {
    console.error("Hotel recommendations error:", error);
    

    
    res.status(500).json({
      success: false,
      error: "Failed to generate hotel recommendations",
      details: error?.message || "Unknown error"
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