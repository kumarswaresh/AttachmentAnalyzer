import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { MarketingCampaignRequest, MarketingCampaignResponse, HotelRecommendation } from "./OpenAIService";

export class BedrockMarketingService {
  private client: BedrockRuntimeClient;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
      }
    });
  }

  async generateMarketingCampaign(request: MarketingCampaignRequest): Promise<MarketingCampaignResponse> {
    const prompt = this.buildClaudePrompt(request);
    
    try {
      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 2000,
          temperature: 0.7,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Parse Claude's response
      const content = responseBody.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error("No valid JSON found in Claude response");
      }

      const result = JSON.parse(jsonMatch[0]);
      return this.validateAndFormatResponse(result);
    } catch (error) {
      console.error("Bedrock Claude API Error:", error);
      throw new Error(`Marketing campaign generation failed: ${error.message}`);
    }
  }

  private buildClaudePrompt(request: MarketingCampaignRequest): string {
    return `You are an expert travel marketing analyst. Create a comprehensive hotel recommendation campaign based on authentic booking patterns and market data.

Requirements:
- Client: ${request.clientName}
- Target Audience: ${request.targetAudience}
- Destination: ${request.destination}
- Travel Type: ${request.travelType}
- Months: ${request.months.join(', ')}
- Minimum Star Rating: ${request.starRating}
- Number of Properties: ${request.propertyCount}
- Additional Criteria: ${request.additionalCriteria || 'None'}

Generate a detailed JSON response with hotel recommendations based on realistic booking data, seasonal patterns, and market insights. Include specific amenities, booking trends, and reasoning for each recommendation.

Response format:
{
  "recommendations": [
    {
      "name": "Actual hotel name",
      "location": "Specific area within destination",
      "starRating": 4,
      "familyFriendly": true,
      "bookingData": [
        {"month": "February", "bookings": 1250, "averageRate": 289},
        {"month": "March", "bookings": 1450, "averageRate": 329}
      ],
      "amenities": ["Pool", "Kids Club", "Beach Access"],
      "reasoning": "Data-driven explanation"
    }
  ],
  "campaignTitle": "Compelling campaign title",
  "targetMessage": "Key marketing message",
  "seasonalInsights": "Seasonal booking analysis",
  "bookingTrends": "Market trend insights"
}`;
  }

  private validateAndFormatResponse(response: any): MarketingCampaignResponse {
    if (!response.recommendations || !Array.isArray(response.recommendations)) {
      throw new Error("Invalid response format: missing recommendations array");
    }

    return {
      recommendations: response.recommendations.map((hotel: any) => ({
        name: hotel.name || "Unknown Hotel",
        location: hotel.location || "Unknown Location",
        starRating: hotel.starRating || 3,
        familyFriendly: hotel.familyFriendly || false,
        bookingData: hotel.bookingData || [],
        amenities: hotel.amenities || [],
        reasoning: hotel.reasoning || "Standard recommendation"
      })),
      campaignTitle: response.campaignTitle || "Travel Recommendations",
      targetMessage: response.targetMessage || "Discover amazing destinations",
      seasonalInsights: response.seasonalInsights || "Seasonal patterns vary",
      bookingTrends: response.bookingTrends || "Booking trends available"
    };
  }

  async testConnection(): Promise<{ success: boolean; model: string; message: string }> {
    try {
      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 50,
          messages: [
            {
              role: "user",
              content: "Hello, please respond with 'Bedrock connection successful'"
            }
          ]
        })
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return {
        success: true,
        model: "claude-3-5-sonnet",
        message: responseBody.content[0].text
      };
    } catch (error) {
      return {
        success: false,
        model: "claude-3-5-sonnet",
        message: error.message
      };
    }
  }
}