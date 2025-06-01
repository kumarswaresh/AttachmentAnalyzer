import React, { useState, useEffect } from 'react';

interface ApiResponse {
  actualOutput?: string;
  success?: boolean;
  metadata?: any;
}

interface PromptTemplate {
  prompt: string;
  description: string;
  agentType: string;
}

function HotelPrompt() {
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
  
  // Event-based form data
  const [formData, setFormData] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    budget: '',
    preferences: '',
    eventType: '',
    eventName: ''
  });

  const [customPrompt, setCustomPrompt] = useState<string>('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/agent-templates');
      const data = await response.json();
      setTemplates(data.filter((t: PromptTemplate) => t.agentType === 'marketing'));
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const buildEnhancedPrompt = () => {
    if (customPrompt.trim()) {
      return customPrompt;
    }

    const basePrompt = `Find hotels in ${formData.location || '[location]'}`;
    const details = [];
    
    if (formData.checkIn && formData.checkOut) {
      details.push(`from ${formData.checkIn} to ${formData.checkOut}`);
    }
    if (formData.guests > 1) {
      details.push(`for ${formData.guests} guests`);
    }
    if (formData.budget) {
      details.push(`with ${formData.budget} budget`);
    }
    if (formData.eventType && formData.eventName) {
      details.push(`attending ${formData.eventName} (${formData.eventType})`);
    }
    if (formData.preferences) {
      details.push(`preferences: ${formData.preferences}`);
    }

    return details.length > 0 ? `${basePrompt} ${details.join(', ')}` : basePrompt;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const response = await fetch('/api/agents/test-marketing-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'hotel_recommendation',
          prompt: buildEnhancedPrompt(),
          useRealData: true,
          requireLLM: true
        }),
      });

      const data: ApiResponse = await response.json();
      
      if (data.success && data.actualOutput) {
        setResponse(data.actualOutput);
      } else {
        setError('Failed to get recommendation');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Hotel Finder AI Demo
          </h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Search Hotels</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter city or location"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in
                    </label>
                    <input
                      type="date"
                      name="checkIn"
                      value={formData.checkIn}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out
                    </label>
                    <input
                      type="date"
                      name="checkOut"
                      value={formData.checkOut}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guests
                  </label>
                  <select
                    name="guests"
                    value={formData.guests}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 Guest</option>
                    <option value={2}>2 Guests</option>
                    <option value={3}>3 Guests</option>
                    <option value={4}>4+ Guests</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Range
                  </label>
                  <select
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select budget</option>
                    <option value="budget">Budget ($50-100/night)</option>
                    <option value="mid-range">Mid-range ($100-250/night)</option>
                    <option value="luxury">Luxury ($250+/night)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No specific event</option>
                    <option value="concert">Concert</option>
                    <option value="festival">Music Festival</option>
                    <option value="conference">Conference</option>
                    <option value="sports">Sports Event</option>
                  </select>
                </div>

                {formData.eventType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Name
                    </label>
                    <input
                      type="text"
                      name="eventName"
                      value={formData.eventName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter event name"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Preferences
                  </label>
                  <textarea
                    name="preferences"
                    value={formData.preferences}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any specific requirements or preferences..."
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Custom Request</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter your own hotel search prompt
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 'Find luxury hotels in Paris for a music festival'"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'Find Hotels'}
                </button>
              </form>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-700">Recommendations</h2>
              
              {loading && (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Getting recommendations...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {response && (
                <div className="bg-green-50 border border-green-200 rounded-md p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">AI Recommendations</h3>
                  <div className="text-green-700 whitespace-pre-wrap">{response}</div>
                </div>
              )}

              {!loading && !response && !error && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
                  <p className="text-gray-600">Enter your search criteria and click "Find Hotels" to get AI-powered recommendations.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HotelPrompt;