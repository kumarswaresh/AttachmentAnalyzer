import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface HotelRequest {
  location: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  budget?: string;
  preferences?: string;
  eventType?: string;
  eventName?: string;
  customPrompt?: string;
}

interface HotelRecommendation {
  name: string;
  category: 'Budget' | 'Mid-Range' | 'Luxury' | 'Boutique';
  priceRange: string;
  location: string;
  rating: number;
  description: string;
  amenities: string[];
  bookingAdvice: string;
  distanceToEvents?: string;
}

interface RecommendationResponse {
  recommendations: HotelRecommendation[];
  insights: string;
  trending: string[];
  events: string[];
  totalOptions: number;
}

class HotelRecommendationService {
  
  async generateRecommendations(request: HotelRequest): Promise<RecommendationResponse> {
    const prompt = this.buildPrompt(request);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: `You are a professional travel advisor with extensive knowledge of hotels worldwide. 
            Provide authentic, detailed hotel recommendations based on current market conditions and real hotel data.
            Always include specific hotel names, realistic pricing, and genuine amenities.
            Format your response as JSON with the following structure:
            {
              "recommendations": [
                {
                  "name": "Actual Hotel Name",
                  "category": "Budget|Mid-Range|Luxury|Boutique",
                  "priceRange": "$XXX-$XXX per night",
                  "location": "Specific area/district",
                  "rating": number,
                  "description": "Detailed description",
                  "amenities": ["amenity1", "amenity2"],
                  "bookingAdvice": "Best booking tips",
                  "distanceToEvents": "if applicable"
                }
              ],
              "insights": "Professional insights about the destination",
              "trending": ["Current trends"],
              "events": ["Relevant events if mentioned"],
              "totalOptions": number
            }`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.7
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const result = JSON.parse(content);
      return this.validateAndEnhanceResponse(result, request);
      
    } catch (error) {
      console.error('Error generating hotel recommendations:', error);
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  private buildPrompt(request: HotelRequest): string {
    if (request.customPrompt) {
      return `${request.customPrompt}

Please provide real hotel recommendations with authentic data including:
- Actual hotel names and locations
- Current market pricing
- Real amenities and services
- Professional booking advice
- Relevant events or trends if applicable`;
    }

    let prompt = `I need hotel recommendations for ${request.location}`;
    
    if (request.checkIn && request.checkOut) {
      prompt += ` from ${request.checkIn} to ${request.checkOut}`;
    }
    
    if (request.guests) {
      prompt += ` for ${request.guests} guest${request.guests > 1 ? 's' : ''}`;
    }
    
    if (request.budget) {
      prompt += `. Budget: ${request.budget}`;
    }
    
    if (request.preferences) {
      prompt += `. Preferences: ${request.preferences}`;
    }
    
    if (request.eventType && request.eventName) {
      prompt += `. I'm attending ${request.eventName} (${request.eventType})`;
    } else if (request.eventType) {
      prompt += `. I'm attending a ${request.eventType}`;
    }
    
    prompt += `

Please provide authentic hotel recommendations with:
1. Real hotel names and current pricing
2. Accurate location details and ratings
3. Genuine amenities and services
4. Professional booking advice
5. Current trends and market insights
6. Any relevant events or festivals in the area

Focus on providing practical, actionable recommendations that I can actually book.`;
    
    return prompt;
  }

  private validateAndEnhanceResponse(response: any, request: HotelRequest): RecommendationResponse {
    // Ensure the response has the expected structure
    const validated: RecommendationResponse = {
      recommendations: response.recommendations || [],
      insights: response.insights || 'No specific insights available for this request.',
      trending: response.trending || [],
      events: response.events || [],
      totalOptions: response.totalOptions || response.recommendations?.length || 0
    };

    // Validate each recommendation has required fields
    validated.recommendations = validated.recommendations.map(hotel => ({
      name: hotel.name || 'Hotel Name Not Available',
      category: this.validateCategory(hotel.category),
      priceRange: hotel.priceRange || 'Pricing varies',
      location: hotel.location || request.location,
      rating: this.validateRating(hotel.rating),
      description: hotel.description || 'Description not available',
      amenities: Array.isArray(hotel.amenities) ? hotel.amenities : [],
      bookingAdvice: hotel.bookingAdvice || 'Book in advance for better rates',
      distanceToEvents: hotel.distanceToEvents
    }));

    return validated;
  }

  private validateCategory(category: string): 'Budget' | 'Mid-Range' | 'Luxury' | 'Boutique' {
    const validCategories = ['Budget', 'Mid-Range', 'Luxury', 'Boutique'];
    return validCategories.includes(category) ? category as any : 'Mid-Range';
  }

  private validateRating(rating: any): number {
    const numRating = parseFloat(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return 4.0; // Default rating
    }
    return Math.round(numRating * 10) / 10; // Round to 1 decimal place
  }

  async searchHotelsByEvent(location: string, eventType: string, eventName?: string): Promise<RecommendationResponse> {
    const request: HotelRequest = {
      location,
      eventType,
      eventName,
      preferences: 'Close to event venues, good transportation links'
    };
    
    return this.generateRecommendations(request);
  }

  async getTrendingDestinations(): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a travel trend analyst. Provide a JSON array of current trending travel destinations based on real market data and booking patterns."
          },
          {
            role: "user",
            content: "What are the top 10 trending travel destinations for hotels this year? Include both international and domestic options. Return as JSON array of destination names."
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500
      });

      const content = response.choices[0].message.content;
      if (content) {
        const result = JSON.parse(content);
        return result.destinations || result.trends || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching trending destinations:', error);
      return [];
    }
  }
}

export const hotelRecommendationService = new HotelRecommendationService();