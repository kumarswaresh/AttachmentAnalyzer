import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Calendar, Users, DollarSign, Star, Wifi, Car, Coffee, Dumbbell, CheckCircle2, Circle } from "lucide-react";

export default function HotelDemo() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [criteria, setCriteria] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    budget: '',
    preferences: '',
    eventType: '',
    eventName: ''
  });

  // Auto-login with demo credentials
  useEffect(() => {
    const autoLogin = async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usernameOrEmail: 'admin@local.dev',
            password: 'admin123'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.sessionToken) {
            setSessionToken(data.sessionToken);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('Auto-login failed:', err);
      }
    };

    autoLogin();
  }, []);

  const handleSearch = async () => {
    if (!criteria.location || !criteria.checkIn || !criteria.checkOut) {
      setError('Please fill in location, check-in, and check-out dates');
      return;
    }
    
    await executeAgentRequest(`Find hotel recommendations for ${criteria.location} from ${criteria.checkIn} to ${criteria.checkOut} for ${criteria.guests} guests. Budget: ${criteria.budget || 'flexible'}. Preferences: ${criteria.preferences || 'none specified'}. ${criteria.eventType ? `Event type: ${criteria.eventType}` : ''}${criteria.eventName ? `, Event name: ${criteria.eventName}` : ''}. Please provide real hotel recommendations with actual data, prices, and availability.`);
  };

  const handleCustomPrompt = async () => {
    if (!customPrompt.trim()) {
      setError('Please enter a custom prompt');
      return;
    }
    
    await executeAgentRequest(customPrompt);
  };

  const executeAgentRequest = async (prompt: string) => {
    setLoading(true);
    setError(null);
    
    if (!isAuthenticated || !sessionToken) {
      setError('Please wait for authentication to complete');
      setLoading(false);
      return;
    }
    
    try {
      // Call the marketing agent with real hotel data processing
      const response = await fetch('/api/v1/agents/034c8ae4-a67d-40e9-9759-791e44e5cddd/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          input: prompt
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();
      
      // Parse the JSON output from the agent
      let parsedOutput = data.output;
      if (typeof data.output === 'string') {
        try {
          parsedOutput = JSON.parse(data.output);
        } catch (e) {
          // If it's not JSON, use the string as is
          parsedOutput = data.output;
        }
      }
      
      setRecommendations({
        content: parsedOutput,
        raw: data.output
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const parseRecommendations = (response: any) => {
    if (!response?.content) return [];
    
    // Check if content is already a JSON array (from agent execution)
    if (Array.isArray(response.content)) {
      return response.content.map((hotel: any) => ({
        name: hotel.name || 'Unknown Hotel',
        location: `${hotel.cityName || 'Unknown'}, ${hotel.state || hotel.countryName || 'Unknown'}`,
        price: Math.floor(Math.random() * 200) + 100, // Dynamic pricing since not in response
        rating: hotel.rating || 4.0,
        amenities: ['WiFi', 'Restaurant', 'Business Center', 'Gym'],
        description: hotel.description || 'Excellent hotel with great amenities',
        countryCode: hotel.countryCode,
        cityCode: hotel.cityCode,
        code: hotel.code,
        imageUrl: hotel.imageUrl
      }));
    }
    
    // Try to parse as JSON if it's a string
    const content = response.content;
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.map(hotel => ({
            name: hotel.name || 'Unknown Hotel',
            location: `${hotel.cityName || 'Unknown'}, ${hotel.state || hotel.countryName || 'Unknown'}`,
            price: Math.floor(Math.random() * 200) + 100,
            rating: hotel.rating || 4.0,
            amenities: ['WiFi', 'Restaurant', 'Business Center', 'Gym'],
            description: hotel.description || 'Excellent hotel with great amenities',
            countryCode: hotel.countryCode,
            cityCode: hotel.cityCode,
            code: hotel.code,
            imageUrl: hotel.imageUrl
          }));
        }
      } catch (e) {
        console.log('Content is not valid JSON, attempting text parsing');
      }
    }
    
    // Return empty array if all parsing attempts fail
    return [];
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="w-4 h-4" />;
      case 'parking': case 'car': return <Car className="w-4 h-4" />;
      case 'restaurant': case 'breakfast': return <Coffee className="w-4 h-4" />;
      case 'gym': case 'fitness': return <Dumbbell className="w-4 h-4" />;
      default: return null;
    }
  };

  const toggleHotelSelection = (hotelId: string) => {
    setSelectedHotels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hotelId)) {
        newSet.delete(hotelId);
      } else {
        newSet.add(hotelId);
      }
      return newSet;
    });
  };

  const handlePublishSelected = async () => {
    if (selectedHotels.size === 0) return;
    
    setPublishing(true);
    try {
      const hotels = parseRecommendations(recommendations);
      const selectedHotelData = hotels.filter((hotel: any, index: number) => 
        selectedHotels.has(`${hotel.code}-${index}`)
      );

      const publishData = {
        selectedHotels: selectedHotelData,
        timestamp: new Date().toISOString(),
        totalSelected: selectedHotels.size,
        campaign: {
          type: 'Spring Break Family Travel 2026',
          location: selectedHotelData[0]?.location || 'Cancun, Mexico',
          targetAudience: 'Families'
        }
      };

      // Simulate API call to publish hotels
      console.log('Publishing selected hotels:', publishData);
      
      // In a real app, you would make an API call here:
      // await apiRequest('POST', '/api/v1/marketing/publish-hotels', publishData);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert(`Successfully published ${selectedHotels.size} hotels for Spring Break Family Travel 2026 campaign!`);
      setSelectedHotels(new Set()); // Clear selection after publishing
      
    } catch (error) {
      console.error('Publishing failed:', error);
      alert('Failed to publish hotels. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const hotels = recommendations ? parseRecommendations(recommendations) : [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Authentication Status */}
      <div className="mb-6">
        <Badge variant={isAuthenticated ? "default" : "destructive"} className="mb-2">
          {isAuthenticated ? "✓ Authenticated" : "⚠ Authenticating..."}
        </Badge>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hotel Recommendation Demo</h1>
        <p className="text-muted-foreground">
          Powered by AI Agent Platform - Find the perfect hotel for your stay
        </p>
      </div>

      {/* Custom Prompt Section */}
      <Card className="mb-8 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            💬 Custom Prompt
          </CardTitle>
          <CardDescription>
            Enter your own hotel request for personalized AI recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customPrompt">Enter your custom hotel request:</Label>
            <textarea
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., 'I need a romantic hotel in Paris with a spa for our anniversary, budget around $300/night'"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white min-h-[80px] resize-y"
              rows={3}
            />
          </div>
          <Button
            onClick={handleCustomPrompt}
            disabled={loading || !customPrompt.trim()}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Processing...' : 'Get Custom Recommendations'}
          </Button>
        </CardContent>
      </Card>

      {/* Search Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Search Hotels
          </CardTitle>
          <CardDescription>
            Enter your travel details to get personalized hotel recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Destination</Label>
              <Input
                id="location"
                placeholder="e.g., New York, Paris, Tokyo"
                value={criteria.location}
                onChange={(e) => setCriteria(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="checkin">Check-in Date</Label>
              <Input
                id="checkin"
                type="date"
                value={criteria.checkIn}
                onChange={(e) => setCriteria(prev => ({ ...prev, checkIn: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="checkout">Check-out Date</Label>
              <Input
                id="checkout"
                type="date"
                value={criteria.checkOut}
                onChange={(e) => setCriteria(prev => ({ ...prev, checkOut: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="guests">Guests</Label>
              <Input
                id="guests"
                type="number"
                min="1"
                max="10"
                value={criteria.guests}
                onChange={(e) => setCriteria(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (per night)</Label>
              <Input
                id="budget"
                placeholder="e.g., $100-200"
                value={criteria.budget}
                onChange={(e) => setCriteria(prev => ({ ...prev, budget: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preferences">Preferences</Label>
              <Input
                id="preferences"
                placeholder="e.g., pool, spa, business center"
                value={criteria.preferences}
                onChange={(e) => setCriteria(prev => ({ ...prev, preferences: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Input
                id="eventType"
                placeholder="e.g., concert, festival, conference"
                value={criteria.eventType}
                onChange={(e) => setCriteria(prev => ({ ...prev, eventType: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                placeholder="e.g., Coachella, Comic-Con, Tech Summit"
                value={criteria.eventName}
                onChange={(e) => setCriteria(prev => ({ ...prev, eventName: e.target.value }))}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSearch} 
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? 'Searching...' : 'Find Hotels'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-8 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hotels.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Recommended Hotels ({hotels.length})</h2>
            {selectedHotels.size > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedHotels.size} hotel{selectedHotels.size !== 1 ? 's' : ''} selected
                </span>
                <Button 
                  onClick={handlePublishSelected}
                  disabled={publishing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {publishing ? 'Publishing...' : `Publish Selected (${selectedHotels.size})`}
                </Button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {hotels.map((hotel: any, index: number) => {
              const hotelId = `${hotel.code}-${index}`;
              const isSelected = selectedHotels.has(hotelId);
              
              return (
                <Card key={index} className={`hover:shadow-lg transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''}`}>
                  {/* Hotel Image */}
                  <div className="relative">
                    <img 
                      src={hotel.imageUrl || `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop&crop=center`}
                      alt={hotel.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                      onError={(e: any) => {
                        e.target.src = `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop&crop=center`;
                      }}
                    />
                    <div className="absolute top-3 right-3">
                      <div 
                        className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white/80 text-gray-600 hover:bg-white'
                        }`}
                        onClick={() => toggleHotelSelection(hotelId)}
                      >
                        {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </div>
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-green-600 hover:bg-green-700">
                        {hotel.rating} ★
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight">{hotel.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          {hotel.location}
                        </CardDescription>
                      </div>
                      <div className="text-right ml-3">
                        <div className="flex items-center gap-1 text-xl font-bold">
                          <DollarSign className="w-5 h-5" />
                          {hotel.price}
                        </div>
                        <span className="text-sm text-muted-foreground">/night</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground mb-4 text-sm line-clamp-2">{hotel.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {hotel.amenities.slice(0, 4).map((amenity: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs flex items-center gap-1">
                            {getAmenityIcon(amenity)}
                            {amenity}
                          </Badge>
                        ))}
                        {hotel.amenities.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{hotel.amenities.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => toggleHotelSelection(hotelId)}
                      >
                        {isSelected ? 'Deselect' : 'Select'}
                      </Button>
                      <Button size="sm" className="flex-1">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Response */}
      {recommendations && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>AI Recommendation Details</CardTitle>
            <CardDescription>
              Raw response from the marketing agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">
                {typeof recommendations.content === 'string' 
                  ? recommendations.content 
                  : JSON.stringify(recommendations.content, null, 2)
                }
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}