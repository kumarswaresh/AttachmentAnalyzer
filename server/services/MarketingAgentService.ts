import OpenAI from "openai";

// Hotel data organized by categories
const HOTEL_CATEGORIES = {
  luxury: [
    "The Ritz-Carlton New York", "Four Seasons Tokyo", "Mandarin Oriental Paris",
    "The Plaza London", "St. Regis Singapore", "Park Hyatt Milan",
    "Shangri-La Sydney", "The Peninsula Hong Kong", "Burj Al Arab Dubai",
    "Hotel de Crillon Paris"
  ],
  business: [
    "Marriott Times Square NYC", "Hilton Tokyo Bay", "Sheraton Paris",
    "Hyatt Regency London", "Crowne Plaza Singapore", "AC Hotel Milan",
    "InterContinental Sydney", "Conrad Hong Kong", "JW Marriott Dubai",
    "Westin Paris Vendôme"
  ],
  budget: [
    "Pod Hotels NYC", "Capsule Hotel Tokyo", "Generator Paris",
    "YHA London", "Backpackers Inn Singapore", "Hotel Milan Central",
    "Wake Up! Sydney", "Mini Hotel Hong Kong", "Citymax Dubai",
    "MIJE Paris Hostels"
  ],
  resort: [
    "Atlantis Paradise Bahamas", "Aman Tokyo", "Club Med Chamonix",
    "Center Parcs UK", "Sentosa Resort Singapore", "Belmond Italy",
    "Hamilton Island Australia", "Shangri-La Mactan", "One&Only Dubai",
    "Pierre & Vacances France"
  ],
  boutique: [
    "The High Line Hotel NYC", "Trunk Hotel Tokyo", "Hotel des Grands Boulevards Paris",
    "Zetter Townhouse London", "New Majestic Singapore", "Portrait Milano",
    "Ovolo Hotels Sydney", "The Upper House Hong Kong", "Al Seef Heritage Dubai",
    "Hôtel Malte Opera Paris"
  ]
};

// Mock Google Trends data for different destinations
const TRENDING_DESTINATIONS = {
  "new york": { popularity: 95, season: "spring", trend: "rising" },
  "paris": { popularity: 88, season: "summer", trend: "stable" },
  "tokyo": { popularity: 92, season: "autumn", trend: "rising" },
  "london": { popularity: 85, season: "winter", trend: "falling" },
  "singapore": { popularity: 78, season: "year-round", trend: "stable" },
  "sydney": { popularity: 82, season: "summer", trend: "rising" },
  "dubai": { popularity: 90, season: "winter", trend: "rising" },
  "milan": { popularity: 70, season: "spring", trend: "stable" },
  "hong kong": { popularity: 75, season: "autumn", trend: "falling" },
  "bahamas": { popularity: 85, season: "winter", trend: "rising" }
};

interface MarketingPrompt {
  query: string;
  preferences?: {
    budget?: "luxury" | "business" | "budget" | "resort" | "boutique";
    destination?: string;
    season?: string;
    travelers?: number;
  };
}

interface HotelRecommendation {
  name: string;
  category: string;
  destination: string;
  trending: boolean;
  popularity: number;
  reason: string;
}

interface MarketingResponse {
  recommendations: HotelRecommendation[];
  trends: {
    destination: string;
    popularity: number;
    season: string;
    trend: string;
  }[];
  insights: string;
  totalHotels: number;
}

export class MarketingAgentService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for marketing agent");
    }
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Get Google Trends data (simulated)
  getGoogleTrends(destination?: string): any {
    if (destination) {
      const key = destination.toLowerCase();
      return TRENDING_DESTINATIONS[key] || { popularity: 50, season: "year-round", trend: "stable" };
    }
    
    return Object.entries(TRENDING_DESTINATIONS).map(([dest, data]) => ({
      destination: dest,
      ...data
    }));
  }

  // Get hotels by category
  getHotelsByCategory(category?: string): any {
    if (category && HOTEL_CATEGORIES[category]) {
      return HOTEL_CATEGORIES[category];
    }
    
    return HOTEL_CATEGORIES;
  }

  // Generate personalized recommendations based on prompt
  async generateRecommendations(prompt: MarketingPrompt): Promise<MarketingResponse> {
    try {
      // Extract preferences from prompt
      const preferences = this.extractPreferences(prompt.query);
      
      // Get relevant trends data
      const trendsData = this.getGoogleTrends();
      const topTrending = trendsData
        .filter(t => t.trend === "rising")
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 5);

      // Generate hotel recommendations
      const recommendations = this.generateHotelRecommendations(prompt.query, preferences);

      // Generate AI insights
      const insights = await this.generateAIInsights(prompt.query, recommendations, topTrending);

      return {
        recommendations,
        trends: topTrending,
        insights,
        totalHotels: Object.values(HOTEL_CATEGORIES).flat().length
      };

    } catch (error) {
      console.error("Error generating recommendations:", error);
      throw new Error("Failed to generate marketing recommendations");
    }
  }

  private extractPreferences(query: string): any {
    const lowerQuery = query.toLowerCase();
    const preferences: any = {};

    // Extract budget preference
    if (lowerQuery.includes("luxury") || lowerQuery.includes("premium") || lowerQuery.includes("high-end")) {
      preferences.budget = "luxury";
    } else if (lowerQuery.includes("business") || lowerQuery.includes("corporate")) {
      preferences.budget = "business";
    } else if (lowerQuery.includes("budget") || lowerQuery.includes("cheap") || lowerQuery.includes("affordable")) {
      preferences.budget = "budget";
    } else if (lowerQuery.includes("resort") || lowerQuery.includes("vacation")) {
      preferences.budget = "resort";
    } else if (lowerQuery.includes("boutique") || lowerQuery.includes("unique")) {
      preferences.budget = "boutique";
    }

    // Extract destination
    for (const [dest] of Object.entries(TRENDING_DESTINATIONS)) {
      if (lowerQuery.includes(dest)) {
        preferences.destination = dest;
        break;
      }
    }

    return preferences;
  }

  private generateHotelRecommendations(query: string, preferences: any): HotelRecommendation[] {
    const recommendations: HotelRecommendation[] = [];
    
    // If specific category requested, focus on that
    if (preferences.budget) {
      const categoryHotels = HOTEL_CATEGORIES[preferences.budget];
      categoryHotels.slice(0, 5).forEach(hotel => {
        const destination = this.extractDestinationFromHotel(hotel);
        const trendData = this.getGoogleTrends(destination);
        
        recommendations.push({
          name: hotel,
          category: preferences.budget,
          destination,
          trending: trendData.trend === "rising",
          popularity: trendData.popularity,
          reason: `${preferences.budget.charAt(0).toUpperCase() + preferences.budget.slice(1)} option in trending destination`
        });
      });
    } else {
      // Mix recommendations from all categories
      Object.entries(HOTEL_CATEGORIES).forEach(([category, hotels]) => {
        const hotel = hotels[0]; // Take first hotel from each category
        const destination = this.extractDestinationFromHotel(hotel);
        const trendData = this.getGoogleTrends(destination);
        
        recommendations.push({
          name: hotel,
          category,
          destination,
          trending: trendData.trend === "rising",
          popularity: trendData.popularity,
          reason: `Top ${category} choice with ${trendData.popularity}% popularity`
        });
      });
    }

    return recommendations.slice(0, 8); // Limit to 8 recommendations
  }

  private extractDestinationFromHotel(hotelName: string): string {
    const destinations = Object.keys(TRENDING_DESTINATIONS);
    for (const dest of destinations) {
      if (hotelName.toLowerCase().includes(dest) || 
          hotelName.toLowerCase().includes(dest.split(' ')[0])) {
        return dest;
      }
    }
    return "international";
  }

  private async generateAIInsights(query: string, recommendations: HotelRecommendation[], trends: any[]): Promise<string> {
    try {
      const systemPrompt = `You are a marketing expert analyzing hotel recommendations and travel trends. 
      Provide insights based on the user query, hotel recommendations, and trending destinations.
      Be concise and actionable.`;

      const userPrompt = `
        User Query: "${query}"
        
        Recommended Hotels: ${recommendations.map(r => `${r.name} (${r.category}, ${r.destination})`).join(", ")}
        
        Trending Destinations: ${trends.map(t => `${t.destination} (${t.popularity}% popularity, ${t.trend})`).join(", ")}
        
        Provide marketing insights and strategy recommendations in 2-3 sentences.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0].message.content || "Marketing insights are being generated based on current trends.";
    } catch (error) {
      console.error("Error generating AI insights:", error);
      return "Based on current market trends, the recommended hotels align with popular destinations and seasonal preferences.";
    }
  }

  // Get all available hotel categories and counts
  getHotelSummary() {
    return {
      categories: Object.keys(HOTEL_CATEGORIES),
      totalHotels: Object.values(HOTEL_CATEGORIES).flat().length,
      hotelsByCategory: Object.fromEntries(
        Object.entries(HOTEL_CATEGORIES).map(([category, hotels]) => [category, hotels.length])
      )
    };
  }
}

export const marketingAgentService = new MarketingAgentService();