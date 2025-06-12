import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Star, Users, Calendar, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MarketingCampaignRequest {
  clientName: string;
  targetAudience: string;
  destination: string;
  travelType: string;
  months: string[];
  starRating: number;
  propertyCount: number;
  additionalCriteria?: string;
}

interface HotelRecommendation {
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

interface MarketingCampaignResponse {
  recommendations: HotelRecommendation[];
  campaignTitle: string;
  targetMessage: string;
  seasonalInsights: string;
  bookingTrends: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TRAVEL_TYPES = [
  'family', 'business', 'leisure', 'couples', 'adventure', 'luxury', 'budget'
];

export default function MarketingCampaigns() {
  const { toast } = useToast();
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['March', 'April']);
  const [formData, setFormData] = useState<MarketingCampaignRequest>({
    clientName: 'ACME Travel Agency',
    targetAudience: 'Families with children',
    destination: 'Cancun',
    travelType: 'family',
    months: ['March', 'April'],
    starRating: 4,
    propertyCount: 12,
    additionalCriteria: ''
  });

  const generateCampaign = useMutation({
    mutationFn: async (request: MarketingCampaignRequest) => {
      const response = await apiRequest('POST', '/api/marketing/campaigns/generate', request);
      return response as { campaign: MarketingCampaignResponse };
    },
    onSuccess: () => {
      toast({
        title: "Campaign Generated",
        description: "Marketing campaign with hotel recommendations generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate marketing campaign",
        variant: "destructive",
      });
    }
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/marketing/test-connection');
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection Test",
        description: data.success ? "OpenAI API connected successfully" : "Connection failed",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    }
  });

  const handleMonthToggle = (month: string) => {
    const newMonths = selectedMonths.includes(month)
      ? selectedMonths.filter(m => m !== month)
      : [...selectedMonths, month];
    setSelectedMonths(newMonths);
    setFormData({ ...formData, months: newMonths });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateCampaign.mutate({ ...formData, months: selectedMonths });
  };

  const campaignData = generateCampaign.data?.campaign as MarketingCampaignResponse | undefined;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Campaign Generator</h1>
          <p className="text-muted-foreground">
            Generate AI-powered hotel recommendations for marketing campaigns
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => testConnection.mutate()}
          disabled={testConnection.isPending}
        >
          {testConnection.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Test AI Connection
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Form */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Requirements</CardTitle>
            <CardDescription>
              Specify your campaign criteria for AI-generated hotel recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="e.g., Families with children"
                />
              </div>

              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="e.g., Cancun, Miami, Orlando"
                />
              </div>

              <div>
                <Label htmlFor="travelType">Travel Type</Label>
                <Select
                  value={formData.travelType}
                  onValueChange={(value) => setFormData({ ...formData, travelType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select travel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAVEL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target Months</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {MONTHS.map((month) => (
                    <Button
                      key={month}
                      type="button"
                      variant={selectedMonths.includes(month) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleMonthToggle(month)}
                    >
                      {month.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="starRating">Minimum Star Rating</Label>
                  <Select
                    value={formData.starRating.toString()}
                    onValueChange={(value) => setFormData({ ...formData, starRating: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5].map((rating) => (
                        <SelectItem key={rating} value={rating.toString()}>
                          {rating} Star{rating > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="propertyCount">Number of Properties</Label>
                  <Input
                    id="propertyCount"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.propertyCount}
                    onChange={(e) => setFormData({ ...formData, propertyCount: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="additionalCriteria">Additional Criteria (Optional)</Label>
                <Textarea
                  id="additionalCriteria"
                  value={formData.additionalCriteria}
                  onChange={(e) => setFormData({ ...formData, additionalCriteria: e.target.value })}
                  placeholder="Any specific requirements or preferences"
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={generateCampaign.isPending || selectedMonths.length === 0}
              >
                {generateCampaign.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Generate Marketing Campaign
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Campaign Results */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Results</CardTitle>
            <CardDescription>
              AI-generated recommendations and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generateCampaign.isPending ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Generating campaign recommendations...</p>
                </div>
              </div>
            ) : campaignData ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{campaignData.campaignTitle}</h3>
                  <p className="text-muted-foreground">{campaignData.targetMessage}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Hotel Recommendations</h4>
                  {campaignData.recommendations.map((hotel, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-semibold">{hotel.name}</h5>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {hotel.location}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{hotel.starRating}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {hotel.amenities.slice(0, 4).map((amenity) => (
                            <Badge key={amenity} variant="secondary" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {hotel.familyFriendly && (
                            <Badge variant="default" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              Family Friendly
                            </Badge>
                          )}
                        </div>

                        {hotel.bookingData.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {hotel.bookingData.slice(0, 2).map((data) => (
                              <div key={data.month} className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{data.month}: {data.bookings} bookings</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground">{hotel.reasoning}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Seasonal Insights</h4>
                    <p className="text-sm text-muted-foreground">{campaignData.seasonalInsights}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Booking Trends</h4>
                    <p className="text-sm text-muted-foreground">{campaignData.bookingTrends}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generate a campaign to see AI recommendations</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}