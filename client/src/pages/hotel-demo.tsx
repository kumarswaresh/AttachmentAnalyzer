import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, DollarSign, Star, Wifi, Car, Coffee, Dumbbell } from "lucide-react";

export default function HotelDemo() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [criteria, setCriteria] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    budget: '',
    preferences: ''
  });

  const handleSearch = async () => {
    if (!criteria.location || !criteria.checkIn || !criteria.checkOut) {
      setError('Please fill in location, check-in, and check-out dates');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Call the marketing agent for hotel recommendations using the test endpoint
      const response = await fetch('/api/agents/testagent-marketing2/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'custom',
          prompt: `Find hotel recommendations for ${criteria.location} from ${criteria.checkIn} to ${criteria.checkOut} for ${criteria.guests} guests. Budget: ${criteria.budget || 'flexible'}. Preferences: ${criteria.preferences || 'none specified'}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();
      // The test endpoint returns a different format, extract the output
      setRecommendations({
        content: data.output || data.response || data.message || 'No response received'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseRecommendations = (response) => {
    if (!response?.content) return [];
    
    // Parse the AI response to extract hotel data
    const content = response.content;
    const hotels = [];
    
    // Simple parsing logic - in production, this would be more sophisticated
    const lines = content.split('\n');
    let currentHotel = null;
    
    lines.forEach(line => {
      if (line.includes('Hotel') || line.includes('Resort')) {
        if (currentHotel && currentHotel.name && currentHotel.location) {
          hotels.push(currentHotel);
        }
        currentHotel = {
          name: line.trim(),
          location: criteria.location || 'Unknown',
          price: 150,
          rating: 4.2,
          amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant'],
          description: 'Great location with excellent amenities'
        };
      } else if (currentHotel && line.trim()) {
        currentHotel.description += ' ' + line.trim();
      }
    });
    
    if (currentHotel && currentHotel.name && currentHotel.location) {
      hotels.push(currentHotel);
    }
    
    // If parsing fails, return sample data
    if (hotels.length === 0) {
      return [
        {
          name: "Grand Plaza Hotel",
          location: criteria.location || "City Center",
          rating: 4.5,
          price: 189,
          amenities: ["WiFi", "Pool", "Gym", "Restaurant", "Spa"],
          description: "Luxury hotel in the heart of the city with world-class amenities and exceptional service."
        },
        {
          name: "Comfort Inn & Suites",
          location: criteria.location || "Downtown",
          rating: 4.2,
          price: 129,
          amenities: ["WiFi", "Breakfast", "Parking", "Gym"],
          description: "Modern comfortable accommodation with excellent value for money and convenient location."
        },
        {
          name: "Boutique Garden Hotel",
          location: criteria.location || "Historic District",
          rating: 4.7,
          price: 245,
          amenities: ["WiFi", "Garden", "Restaurant", "Concierge"],
          description: "Charming boutique hotel with personalized service and beautiful garden setting."
        }
      ];
    }
    
    return hotels;
  };

  const getAmenityIcon = (amenity) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="w-4 h-4" />;
      case 'parking': case 'car': return <Car className="w-4 h-4" />;
      case 'restaurant': case 'breakfast': return <Coffee className="w-4 h-4" />;
      case 'gym': case 'fitness': return <Dumbbell className="w-4 h-4" />;
      default: return null;
    }
  };

  const hotels = recommendations ? parseRecommendations(recommendations) : [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hotel Recommendation Demo</h1>
        <p className="text-muted-foreground">
          Powered by AI Agent Platform - Find the perfect hotel for your stay
        </p>
      </div>

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
          <h2 className="text-2xl font-semibold">Recommended Hotels</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hotels.map((hotel, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{hotel.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />
                        {hotel.location}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{hotel.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-lg font-bold">
                        <DollarSign className="w-5 h-5" />
                        {hotel.price}
                        <span className="text-sm font-normal text-muted-foreground">/night</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-muted-foreground mb-4">{hotel.description}</p>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Amenities</Label>
                    <div className="flex flex-wrap gap-2">
                      {hotel.amenities.map((amenity, i) => (
                        <Badge key={i} variant="secondary" className="flex items-center gap-1">
                          {getAmenityIcon(amenity)}
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button className="w-full mt-4">
                    View Details & Book
                  </Button>
                </CardContent>
              </Card>
            ))}
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
                {recommendations.content || 'No detailed response available'}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}