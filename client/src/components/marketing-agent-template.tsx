import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModuleConfig, GuardrailPolicy } from "@shared/schema";

interface MarketingAgentTemplateProps {
  onUseTemplate: (templateData: {
    name: string;
    goal: string;
    role: string;
    guardrails: GuardrailPolicy;
    modules: ModuleConfig[];
    model: string;
    vectorStoreId: string;
  }) => void;
}

export function MarketingAgentTemplate({ onUseTemplate }: MarketingAgentTemplateProps) {
  const handleUseTemplate = () => {
    const templateData = {
      name: "Hotel Marketing Agent",
      goal: "Analyze market trends using Google Trends and provide personalized hotel recommendations across 5 categories (Luxury, Business, Budget, Resort, Boutique) with 10 hotels each. Respond to user prompts with data-driven insights and tailored hotel suggestions based on preferences, location, and trending destinations.",
      role: "marketing",
      guardrails: {
        requireHumanApproval: false,
        contentFiltering: true,
        readOnlyMode: false,
        maxTokens: 8000,
        allowedDomains: ["trends.google.com", "booking.com", "expedia.com"],
        blockedKeywords: ["fraud", "scam", "illegal"],
      },
      modules: [
        {
          moduleId: "google-trends-module",
          version: "1.0.0",
          config: {
            apiEnabled: true,
            regions: ["US", "EU", "APAC"],
            categories: ["travel", "hospitality", "tourism"],
            updateFrequency: "daily"
          },
          enabled: true,
        },
        {
          moduleId: "hotel-mcp-connector",
          version: "1.0.0",
          config: {
            hotelCategories: {
              luxury: {
                hotels: [
                  "The Ritz-Carlton New York", "Four Seasons Tokyo", "Mandarin Oriental Paris",
                  "The Plaza London", "St. Regis Singapore", "Park Hyatt Milan",
                  "Shangri-La Sydney", "The Peninsula Hong Kong", "Burj Al Arab Dubai",
                  "Hotel de Crillon Paris"
                ]
              },
              business: {
                hotels: [
                  "Marriott Times Square NYC", "Hilton Tokyo Bay", "Sheraton Paris",
                  "Hyatt Regency London", "Crowne Plaza Singapore", "AC Hotel Milan",
                  "InterContinental Sydney", "Conrad Hong Kong", "JW Marriott Dubai",
                  "Westin Paris Vendôme"
                ]
              },
              budget: {
                hotels: [
                  "Pod Hotels NYC", "Capsule Hotel Tokyo", "Generator Paris",
                  "YHA London", "Backpackers Inn Singapore", "Hotel Milan Central",
                  "Wake Up! Sydney", "Mini Hotel Hong Kong", "Citymax Dubai",
                  "MIJE Paris Hostels"
                ]
              },
              resort: {
                hotels: [
                  "Atlantis Paradise Bahamas", "Aman Tokyo", "Club Med Chamonix",
                  "Center Parcs UK", "Sentosa Resort Singapore", "Belmond Italy",
                  "Hamilton Island Australia", "Shangri-La Mactan", "One&Only Dubai",
                  "Pierre & Vacances France"
                ]
              },
              boutique: {
                hotels: [
                  "The High Line Hotel NYC", "Trunk Hotel Tokyo", "Hotel des Grands Boulevards Paris",
                  "Zetter Townhouse London", "New Majestic Singapore", "Portrait Milano",
                  "Ovolo Hotels Sydney", "The Upper House Hong Kong", "Al Seef Heritage Dubai",
                  "Hôtel Malte Opera Paris"
                ]
              }
            },
            defaultRecommendations: 5,
            includeAvailability: true,
            includePricing: true
          },
          enabled: true,
        },
        {
          moduleId: "prompt-module",
          version: "2.1.0",
          config: {
            systemPrompt: "You are a sophisticated hotel marketing agent with access to Google Trends data and comprehensive hotel information across 5 categories. Provide personalized recommendations based on user preferences, current trends, and destination popularity.",
            maxPromptLength: 2000,
            responseFormat: "structured"
          },
          enabled: true,
        },
        {
          moduleId: "logging-module",
          version: "1.5.0",
          config: {
            logLevel: "info",
            includeMetrics: true
          },
          enabled: true,
        }
      ],
      model: "claude-3-5-sonnet-20241022",
      vectorStoreId: "hotel-marketing-vector-store",
    };

    onUseTemplate(templateData);
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-900">Hotel Marketing Agent Template</CardTitle>
            <p className="text-blue-700 mt-2">
              Pre-configured agent for hotel marketing with Google Trends and MCP hotel data integration
            </p>
          </div>
          <Button onClick={handleUseTemplate} className="bg-blue-600 hover:bg-blue-700">
            Use This Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Included Features</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Google Trends integration for market analysis</li>
              <li>• 5 hotel categories with 10 hotels each</li>
              <li>• Prompt-based personalized recommendations</li>
              <li>• Real-time trend analysis</li>
              <li>• Multi-region support (US, EU, APAC)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Hotel Categories</h4>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-blue-700 border-blue-300">Luxury (10)</Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-300">Business (10)</Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-300">Budget (10)</Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-300">Resort (10)</Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-300">Boutique (10)</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}