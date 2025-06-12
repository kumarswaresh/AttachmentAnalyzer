import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Star, Users, Calendar, DollarSign, FileText, Cloud } from "lucide-react";

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

export default function MarketingBedrockDemo() {
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiContent, setAiContent] = useState<string | null>(null);

  const generateCampaign = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/marketing/demo-campaign-bedrock', {
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
        seasonalInsights: `Campaign generated using ${data.model} with AWS Bedrock`,
        bookingTrends: `Provider: ${data.provider} | Generated: ${new Date(data.campaign.generatedAt).toLocaleString()}`,
        recommendations: [
          {
            name: "AWS Bedrock Campaign Content",
            location: data.campaign.destination,
            starRating: 5,
            familyFriendly: true,
            bookingData: [
              { month: "AI Generated", bookings: data.usage?.input_tokens || 0, averageRate: data.usage?.output_tokens || 0 }
            ],
            amenities: ["Claude 3.5 Sonnet", "AWS Bedrock", "Real-time Generation"],
            reasoning: "Complete AI-generated marketing campaign content displayed below"
          }
        ]
      };

      setCampaign(aiCampaign);
      setAiContent(data.campaign.content);
    } catch (err) {
      setError("Failed to generate marketing campaign. Please check your AWS credentials configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cloud className="h-8 w-8 text-orange-500" />
            AWS Bedrock Marketing Campaign Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate intelligent hotel recommendations using AWS Bedrock with Claude 3.5 Sonnet for family travel to Cancun
          </p>
        </div>
        <Button 
          onClick={generateCampaign} 
          disabled={isLoading}
          size="lg"
          className="bg-orange-600 hover:bg-orange-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Campaign...
            </>
          ) : (
            <>
              <Cloud className="mr-2 h-4 w-4" />
              Generate with Bedrock
            </>
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
              <CardTitle className="text-2xl flex items-center gap-2">
                <Cloud className="h-6 w-6 text-orange-500" />
                {campaign.campaignTitle}
              </CardTitle>
              <CardDescription className="text-lg">{campaign.targetMessage}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Model Information</h3>
                <p className="text-sm text-muted-foreground">{campaign.seasonalInsights}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Generation Details</h3>
                <p className="text-sm text-muted-foreground">{campaign.bookingTrends}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <h2 className="text-2xl font-bold">AWS Bedrock Response</h2>
            {campaign.recommendations.map((hotel, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {hotel.name}
                        <div className="flex items-center">
                          {Array.from({ length: hotel.starRating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />
                          ))}
                        </div>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {hotel.location}
                      </CardDescription>
                    </div>
                    {hotel.familyFriendly && (
                      <Badge className="bg-orange-100 text-orange-800">
                        <Users className="h-3 w-3 mr-1" />
                        AWS Bedrock
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{hotel.reasoning}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">Provider Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {hotel.amenities.map((amenity, i) => (
                        <Badge key={i} variant="secondary" className="bg-orange-50 text-orange-700">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Usage Data</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {hotel.bookingData.map((data, i) => (
                        <div key={i} className="bg-orange-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{data.month}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div>{data.bookings.toLocaleString()} input tokens</div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {data.averageRate} output tokens
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
              <CardTitle>AWS Bedrock Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    Claude 3.5
                  </div>
                  <div className="text-sm text-muted-foreground">Sonnet Model</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    AWS
                  </div>
                  <div className="text-sm text-muted-foreground">Bedrock Platform</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    Enterprise
                  </div>
                  <div className="text-sm text-muted-foreground">Grade Security</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {aiContent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Complete AWS Bedrock Marketing Campaign
                </CardTitle>
                <CardDescription>
                  Full marketing brief generated by Claude 3.5 Sonnet via AWS Bedrock for Nicky's Spring Break 2026 campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <pre className="whitespace-pre-wrap text-sm font-mono max-h-96 overflow-y-auto text-orange-900">
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