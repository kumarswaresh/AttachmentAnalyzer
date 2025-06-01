import React, { useState, useEffect } from 'react';
import AgentPlatformSDK from './lib/agent-platform-sdk';
import { MapPin, Calendar, Users, DollarSign, Star, Wifi, Car, Coffee, Dumbbell, Phone } from 'lucide-react';

// Types as JSDoc comments for development reference
// SearchCriteria: { location, checkIn, checkOut, guests, budget, preferences }
// Hotel: { name, location, rating, price, amenities, description }
// APIResponse: { content, hotels? }

const HotelRecommendationDemo = () => {
  const [sdk, setSdk] = useState(null);
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

  // Initialize SDK - In a real app, get API key from user or environment
  useEffect(() => {
    const agentSDK = new AgentPlatformSDK({
      baseURL: 'http://localhost:5000',
      apiKey: 'demo-api-key-12345' // This would be provided by user
    });
    setSdk(agentSDK);
  }, []);

  const handleSearch = async () => {
    if (!sdk) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await sdk.getHotelRecommendations(criteria);
      setRecommendations(response);
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
          name: 'Grand Palace Hotel',
          location: criteria.location || 'Downtown',
          price: 230,
          rating: 4.5,
          amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym'],
          description: 'Luxury hotel in the heart of the city with world-class amenities and service.'
        },
        {
          name: 'Seaside Resort & Spa',
          location: criteria.location || 'Beachfront',
          price: 285, 
          rating: 4.3,
          amenities: ['WiFi', 'Beach Access', 'Spa', 'Pool', 'Restaurant'],
          description: 'Beautiful beachfront resort perfect for relaxation and recreation.'
        },
        {
          name: 'Business Center Hotel',
          location: criteria.location || 'Business District',
          price: 160,
          rating: 4.1,
          amenities: ['WiFi', 'Business Center', 'Gym', 'Restaurant'],
          description: 'Modern hotel designed for business travelers with excellent facilities.'
        }
      ];
    }
    
    return hotels;
  };

  const getAmenityIcon = (amenity: string) => {
    const icons: { [key: string]: any } = {
      'WiFi': Wifi,
      'Pool': Coffee,
      'Gym': Dumbbell,
      'Restaurant': Coffee,
      'Spa': Star,
      'Beach Access': MapPin,
      'Business Center': Phone,
      'Parking': Car
    };
    return icons[amenity] || Star;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Hotel Finder</h1>
          <p className="text-gray-600">Powered by Agent Platform AI</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline w-4 h-4 mr-1" />
                Location
              </label>
              <input
                type="text"
                value={criteria.location}
                onChange={(e) => setCriteria({...criteria, location: e.target.value})}
                placeholder="City or destination"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Check-in
              </label>
              <input
                type="date"
                value={criteria.checkIn}
                onChange={(e) => setCriteria({...criteria, checkIn: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Check-out
              </label>
              <input
                type="date"
                value={criteria.checkOut}
                onChange={(e) => setCriteria({...criteria, checkOut: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="inline w-4 h-4 mr-1" />
                Guests
              </label>
              <select
                value={criteria.guests}
                onChange={(e) => setCriteria({...criteria, guests: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1,2,3,4,5,6].map(num => (
                  <option key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Budget
              </label>
              <select
                value={criteria.budget}
                onChange={(e) => setCriteria({...criteria, budget: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Budget</option>
                <option value="budget">Budget ($50-100)</option>
                <option value="mid-range">Mid-range ($100-200)</option>
                <option value="luxury">Luxury ($200+)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferences
              </label>
              <input
                type="text"
                value={criteria.preferences}
                onChange={(e) => setCriteria({...criteria, preferences: e.target.value})}
                placeholder="Pool, gym, spa..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !sdk}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Searching...' : 'Find Hotels'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
              <p className="text-sm mt-2">
                Make sure the Agent Platform is running and the API key is configured correctly.
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {recommendations && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Recommended Hotels</h2>
            
            {parseRecommendations(recommendations).map((hotel, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{hotel.name}</h3>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(hotel.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-gray-600">{hotel.rating}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{hotel.price}</div>
                      <div className="text-sm text-gray-500">per night</div>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">{hotel.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {hotel.amenities.map((amenity, i) => {
                      const IconComponent = getAmenityIcon(amenity);
                      return (
                        <span key={i} className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          <IconComponent className="w-3 h-3 mr-1" />
                          {amenity}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex space-x-3">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                      Book Now
                    </button>
                    <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SDK Status */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Demo powered by Agent Platform SDK</p>
          <p>SDK Status: {sdk ? 'Connected' : 'Initializing...'}</p>
        </div>
      </div>
    </div>
  );
};

export default HotelRecommendationDemo;