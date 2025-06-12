import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

export class OpenAIMarketingService {
  async generateMarketingCampaign(request: MarketingCampaignRequest): Promise<MarketingCampaignResponse> {
    const prompt = this.buildMarketingPrompt(request);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using available model since gpt-4.1-nano may not be available yet
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

      const content = response.choices[0].message.content || '{}';
      console.log("Raw OpenAI Response:", content);
      
      // Try to clean up common JSON formatting issues
      let cleanedContent = content;
      try {
        // Remove any trailing commas before closing braces/brackets
        cleanedContent = content.replace(/,(\s*[}\]])/g, '$1');
        // Ensure proper escaping of quotes in strings
        cleanedContent = cleanedContent.replace(/([^\\])"/g, '$1\\"');
        // Fix the escaping we just broke for legitimate quotes
        cleanedContent = cleanedContent.replace(/\\\\"/g, '\\"');
        cleanedContent = cleanedContent.replace(/^\\"/g, '"');
        cleanedContent = cleanedContent.replace(/\\"$/g, '"');
        
        const result = JSON.parse(cleanedContent);
        return this.validateAndFormatResponse(result);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Cleaned content:", cleanedContent);
        
        // Fallback: try to extract valid JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[0]);
            return this.validateAndFormatResponse(result);
          } catch (fallbackError) {
            console.error("Fallback parse also failed:", fallbackError);
          }
        }
        
        // If all else fails, return a structured error response
        return {
          recommendations: [{
            name: "Error - Unable to generate recommendations",
            location: "N/A",
            starRating: 0,
            familyFriendly: false,
            bookingData: [],
            amenities: [],
            reasoning: "AI service encountered a parsing error"
          }],
          campaignTitle: "Campaign Generation Error",
          targetMessage: "Unable to parse response from AI service",
          seasonalInsights: "Error occurred during generation",
          bookingTrends: "Unable to analyze trends due to parsing error"
        };
      }
    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      throw new Error(`Marketing campaign generation failed: ${error.message}`);
    }
  }

  private buildMarketingPrompt(request: MarketingCampaignRequest): string {
    return `
As a travel marketing expert, create a comprehensive hotel recommendation campaign for the following requirements:

Client: ${request.clientName}
Target Audience: ${request.targetAudience}
Destination: ${request.destination}
Travel Type: ${request.travelType}
Months: ${request.months.join(', ')}
Minimum Star Rating: ${request.starRating}
Number of Properties: ${request.propertyCount}
Additional Criteria: ${request.additionalCriteria || 'None'}

IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON object.

Generate a JSON response with exactly this structure:
{
  "recommendations": [
    {
      "name": "Hotel Name",
      "location": "Specific location within destination",
      "starRating": 4,
      "familyFriendly": true,
      "bookingData": [
        {"month": "February", "bookings": 1250, "averageRate": 289},
        {"month": "March", "bookings": 1450, "averageRate": 329},
        {"month": "April", "bookings": 1380, "averageRate": 319}
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

Rules:
- Use double quotes for all strings
- No trailing commas
- Escape any quotes within string values
- Focus on authentic data patterns and seasonal trends
- Include ${request.propertyCount} hotel recommendations
`;
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