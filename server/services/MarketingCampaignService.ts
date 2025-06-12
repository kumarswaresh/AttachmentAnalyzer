import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface MarketingCampaignRequest {
  clientName: string;
  targetAudience: string;
  destination: string;
  travelType: string;
  months: string[];
  starRating: number;
  propertyCount: number;
  additionalCriteria?: string;
}

export interface HotelRecommendation {
  name: string;
  location: string;
  starRating: number;
  familyFriendly: boolean;
  bookingData: {
    month: string;
    bookings: number;
    averageRate: number;
  }[];
  amenities: string[];
  reasoning: string;
}

export interface MarketingCampaignResponse {
  recommendations: HotelRecommendation[];
  campaignTitle: string;
  targetMessage: string;
  seasonalInsights: string;
  bookingTrends: string;
}

export class MarketingCampaignService {
  async generateCampaign(request: MarketingCampaignRequest): Promise<MarketingCampaignResponse> {
    const prompt = this.buildPrompt(request);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert travel marketing analyst specializing in hotel recommendations and campaign development. Provide detailed, data-driven recommendations in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateResponse(result);
    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      throw new Error(`Campaign generation failed: ${error.message}`);
    }
  }

  private buildPrompt(request: MarketingCampaignRequest): string {
    return `
Create a comprehensive hotel recommendation campaign for:

Client: ${request.clientName}
Target Audience: ${request.targetAudience}
Destination: ${request.destination}
Travel Type: ${request.travelType}
Months: ${request.months.join(', ')}
Minimum Star Rating: ${request.starRating}
Number of Properties: ${request.propertyCount}
Additional Criteria: ${request.additionalCriteria || 'None'}

Generate a JSON response with realistic booking data and insights:

{
  "recommendations": [
    {
      "name": "Hotel Name",
      "location": "Specific location within destination",
      "starRating": 4,
      "familyFriendly": true,
      "bookingData": [
        {"month": "March", "bookings": 1250, "averageRate": 289},
        {"month": "April", "bookings": 1450, "averageRate": 329}
      ],
      "amenities": ["Pool", "Kids Club", "Beach Access"],
      "reasoning": "Why this hotel fits the criteria"
    }
  ],
  "campaignTitle": "Engaging campaign title",
  "targetMessage": "Key marketing message for the target audience",
  "seasonalInsights": "Analysis of seasonal booking patterns",
  "bookingTrends": "Trends and insights for the specified period"
}

Focus on authentic data patterns and family-friendly features for ${request.destination}.
`;
  }

  private validateResponse(response: any): MarketingCampaignResponse {
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
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello, please respond with 'Connection successful'" }],
        max_tokens: 10
      });

      return {
        success: true,
        model: "gpt-4o-mini",
        message: response.choices[0].message.content || "Connected"
      };
    } catch (error: any) {
      return {
        success: false,
        model: "gpt-4o-mini",
        message: error.message
      };
    }
  }
}

export const marketingCampaignService = new MarketingCampaignService();