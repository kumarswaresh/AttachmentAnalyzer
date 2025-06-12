import { Router } from 'express';
import { BedrockMarketingService } from '../../services/BedrockService';
import { openaiMarketingService } from '../../services/OpenAIService-fixed';

export const marketingRoutes = Router();

// Sample hotel data in the required format
const sampleHotelData = [
  {
    "countryCode": "MX",
    "countryName": "Mexico",
    "stateCode": "ROO",
    "state": "Quintana Roo",
    "cityCode": 11,
    "cityName": "Cancun",
    "code": 501,
    "name": "Crown Paradise Club Cancun",
    "rating": 3.5,
    "description": "A family-centric resort featuring water slides, kids' clubs, and beachfront access, making it a favorite for families with young children.",
    "imageUrl": "https://example.com/images/crown-paradise-club-cancun.jpg"
  },
  {
    "countryCode": "MX",
    "countryName": "Mexico",
    "stateCode": "ROO",
    "state": "Quintana Roo",
    "cityCode": 11,
    "cityName": "Cancun",
    "code": 502,
    "name": "Seadust Cancun Family Resort",
    "rating": 4.0,
    "description": "An all-inclusive resort with a treasure island-themed water park, mini-golf, and a variety of family-friendly entertainment.",
    "imageUrl": "https://example.com/images/seadust-cancun-family-resort.jpg"
  },
  {
    "countryCode": "MX",
    "countryName": "Mexico",
    "stateCode": "ROO",
    "state": "Quintana Roo",
    "cityCode": 11,
    "cityName": "Cancun",
    "code": 503,
    "name": "The Royal Sands Resort & Spa",
    "rating": 4.5,
    "description": "Offers spacious villas perfect for families, with multiple pools, a kids' club, and organized activities on the beach.",
    "imageUrl": "https://example.com/images/the-royal-sands-resort-spa.jpg"
  },
  {
    "countryCode": "MX",
    "countryName": "Mexico",
    "stateCode": "ROO",
    "state": "Quintana Roo",
    "cityCode": 11,
    "cityName": "Cancun",
    "code": 504,
    "name": "Fiesta Americana Condesa Cancun",
    "rating": 4.2,
    "description": "Features a Mayan-themed design with a large pool, supervised kids' club, and cultural activities for the whole family.",
    "imageUrl": "https://example.com/images/fiesta-americana-condesa-cancun.jpg"
  },
  {
    "countryCode": "MX",
    "countryName": "Mexico",
    "stateCode": "ROO",
    "state": "Quintana Roo",
    "cityCode": 11,
    "cityName": "Cancun",
    "code": 505,
    "name": "Panama Jack Resorts Cancun",
    "rating": 3.8,
    "description": "A fun, all-inclusive resort with family suites, a water park, and daily entertainment suitable for all ages.",
    "imageUrl": "https://example.com/images/panama-jack-resorts-cancun.jpg"
  },
  {
    "countryCode": "US",
    "countryName": "United States",
    "stateCode": "FL",
    "state": "Florida",
    "cityCode": 21,
    "cityName": "Orlando",
    "code": 601,
    "name": "Disney's Grand Floridian Resort & Spa",
    "rating": 4.8,
    "description": "Victorian elegance meets Disney magic with monorail access to Magic Kingdom, award-winning dining, and luxurious spa services.",
    "imageUrl": "https://example.com/images/disneys-grand-floridian.jpg"
  },
  {
    "countryCode": "US",
    "countryName": "United States",
    "stateCode": "FL",
    "state": "Florida",
    "cityCode": 21,
    "cityName": "Orlando",
    "code": 602,
    "name": "Universal's Cabana Bay Beach Resort",
    "rating": 4.3,
    "description": "Retro-themed family resort with two pools, bowling alley, and early park admission to Universal Studios theme parks.",
    "imageUrl": "https://example.com/images/universals-cabana-bay.jpg"
  }
];

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
    
    // Filter hotels based on request criteria
    let filteredHotels = sampleHotelData.filter(hotel => {
      if (starRating && hotel.rating < starRating - 0.5) return false;
      if (destination.toLowerCase().includes('cancun') && hotel.cityName.toLowerCase() !== 'cancun') return false;
      if (destination.toLowerCase().includes('orlando') && hotel.cityName.toLowerCase() !== 'orlando') return false;
      return true;
    });
    
    // Limit results to requested count
    filteredHotels = filteredHotels.slice(0, propertyCount || 5);
    
    // Return in exact format specified
    res.json(filteredHotels);
    
  } catch (error: any) {
    console.error("Hotel recommendations error:", error);
    res.status(500).json({
      success: false,
      error: error.message
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