import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Star, Users, Calendar, DollarSign, FileText } from "lucide-react";

interface HotelRecommendation {
  name: string;
  location: string;
  starRating: number;
  familyFriendly: boolean;
  bookingData: Array<{
    month: string;
    bookings: number;
    averageRate: number;
  }>;
  amenities: string[];
  reasoning: string;
}

interface MarketingCampaign {
  recommendations: HotelRecommendation[];
  campaignTitle: string;
  targetMessage: string;
  seasonalInsights: string;
  bookingTrends: string;
}

export default function MarketingDemo() {
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiContent, setAiContent] = useState<string | null>(null);

  const generateCampaign = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/marketing/demo-campaign', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate campaign');
      }
      
      const data = await response.json();
      
      // Display the complete AI-generated content with campaign metadata
      const aiCampaign: MarketingCampaign = {
        campaignTitle: data.campaign.clientName + " - " + data.campaign.targetSeason,
        targetMessage: `AI-generated marketing campaign for ${data.campaign.travelType} targeting ${data.campaign.destination}`,
        seasonalInsights: `Campaign generated using ${data.model} with ${data.usage?.total_tokens || 0} tokens`,
        bookingTrends: `Provider: ${data.provider} | Generated: ${new Date(data.campaign.generatedAt).toLocaleString()}`,
        recommendations: [
          {
            name: "AI Campaign Content",
            location: data.campaign.destination,
            starRating: 5,
            familyFriendly: true,
            bookingData: [
              { month: "AI Generated", bookings: data.usage?.total_tokens || 0, averageRate: data.usage?.completion_tokens || 0 }
            ],
            amenities: ["OpenAI GPT-4o", "Real-time Generation", "Comprehensive Analysis"],
            reasoning: "Complete AI-generated marketing campaign content displayed below"
          }
        ]
      };

      setCampaign(aiCampaign);
      setAiContent(data.campaign.content);
    } catch (err) {
      setError("Failed to generate marketing campaign. Please check your API configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Marketing Campaign Generator</h1>
          <p className="text-muted-foreground mt-2">
            Generate intelligent hotel recommendations using OpenAI GPT-4 for family travel to Cancun
          </p>
        </div>
        <Button 
          onClick={generateCampaign} 
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Campaign...
            </>
          ) : (
            "Generate Campaign"
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {campaign && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{campaign.campaignTitle}</CardTitle>
              <CardDescription className="text-lg">{campaign.targetMessage}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Seasonal Insights</h3>
                <p className="text-sm text-muted-foreground">{campaign.seasonalInsights}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Booking Trends</h3>
                <p className="text-sm text-muted-foreground">{campaign.bookingTrends}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <h2 className="text-2xl font-bold">Hotel Recommendations</h2>
            {campaign.recommendations.map((hotel, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {hotel.name}
                        <div className="flex items-center">
                          {Array.from({ length: hotel.starRating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {hotel.location}
                      </CardDescription>
                    </div>
                    {hotel.familyFriendly && (
                      <Badge className="bg-green-100 text-green-800">
                        <Users className="h-3 w-3 mr-1" />
                        Family Friendly
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{hotel.reasoning}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {hotel.amenities.map((amenity, i) => (
                        <Badge key={i} variant="secondary">{amenity}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Booking Data</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {hotel.bookingData.map((data, i) => (
                        <div key={i} className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{data.month}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div>{data.bookings.toLocaleString()} bookings</div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${data.averageRate}/night avg
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {campaign.recommendations.reduce((sum, hotel) => 
                      sum + hotel.bookingData.reduce((monthSum, data) => monthSum + data.bookings, 0), 0
                    ).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Bookings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ${Math.round(
                      campaign.recommendations.reduce((sum, hotel) => 
                        sum + hotel.bookingData.reduce((monthSum, data) => monthSum + data.averageRate, 0), 0
                      ) / campaign.recommendations.reduce((sum, hotel) => sum + hotel.bookingData.length, 0)
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Nightly Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {campaign.recommendations.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Hotels Recommended</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {aiContent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Complete AI-Generated Marketing Campaign
                </CardTitle>
                <CardDescription>
                  Full marketing brief generated by OpenAI GPT-4o for Nicky's Spring Break 2026 campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono max-h-96 overflow-y-auto">
                    {aiContent}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}