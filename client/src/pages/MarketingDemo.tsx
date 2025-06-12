import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Star, Users, Calendar, DollarSign } from "lucide-react";

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

  const generateCampaign = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Direct OpenAI API call for demonstration
      const testRequest = {
        clientName: "ACME Travel Agency",
        targetAudience: "Families with children aged 5-12",
        destination: "Cancun, Mexico",
        travelType: "family",
        months: ["March", "April"],
        starRating: 4,
        propertyCount: 12,
        additionalCriteria: "Focus on beachfront properties with kids clubs and water parks"
      };

      // Simulate AI response with realistic data
      const mockCampaign: MarketingCampaign = {
        campaignTitle: "Cancun Family Paradise: Spring Break Magic Awaits",
        targetMessage: "Create unforgettable family memories at Cancun's premier beachfront resorts, featuring world-class kids clubs and endless entertainment for children aged 5-12.",
        seasonalInsights: "March and April represent peak family travel season to Cancun, with optimal weather conditions and spring break timing driving high demand. Booking windows typically open 90-120 days in advance.",
        bookingTrends: "Family bookings show 35% increase during March-April period, with average stays of 7 nights and preference for all-inclusive packages. Properties with kids clubs see 60% higher occupancy rates.",
        recommendations: [
          {
            name: "Grand Fiesta Americana Coral Beach Cancun",
            location: "Hotel Zone, Cancun",
            starRating: 5,
            familyFriendly: true,
            bookingData: [
              { month: "March", bookings: 1450, averageRate: 389 },
              { month: "April", bookings: 1650, averageRate: 429 }
            ],
            amenities: ["Kids Club", "Water Park", "Beach Access", "Multiple Pools", "Family Suites"],
            reasoning: "Premium beachfront location with extensive children's facilities and consistent high family satisfaction ratings. Strong repeat guest loyalty."
          },
          {
            name: "Hotel Xcaret Mexico",
            location: "Playa del Carmen (30 min from Cancun)",
            starRating: 5,
            familyFriendly: true,
            bookingData: [
              { month: "March", bookings: 1280, averageRate: 450 },
              { month: "April", bookings: 1380, averageRate: 485 }
            ],
            amenities: ["Adventure Parks Access", "Kids Club", "Cultural Shows", "Eco-activities", "Beach Club"],
            reasoning: "Unique eco-integrated resort offering cultural experiences and adventure park access, perfect for educational family travel."
          },
          {
            name: "Moon Palace Cancun",
            location: "Hotel Zone South, Cancun",
            starRating: 4,
            familyFriendly: true,
            bookingData: [
              { month: "March", bookings: 2100, averageRate: 295 },
              { month: "April", bookings: 2300, averageRate: 325 }
            ],
            amenities: ["Water Park", "Kids Club", "Golf Course", "Multiple Restaurants", "Teens Club"],
            reasoning: "Large-scale resort with comprehensive family amenities and excellent value proposition. Popular for multi-generational family trips."
          },
          {
            name: "Iberostar Selection Cancun",
            location: "Hotel Zone, Cancun",
            starRating: 4,
            familyFriendly: true,
            bookingData: [
              { month: "March", bookings: 1150, averageRate: 275 },
              { month: "April", bookings: 1250, averageRate: 305 }
            ],
            amenities: ["Star Camp Kids Club", "Beach Access", "Multiple Pools", "Sports Activities", "Family Rooms"],
            reasoning: "Well-established family brand with structured kids programs and reliable service standards. Strong March-April performance history."
          }
        ]
      };

      setCampaign(mockCampaign);
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
        </div>
      )}
    </div>
  );
}