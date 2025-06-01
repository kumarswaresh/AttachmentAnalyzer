import { useState, useEffect } from 'react';

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

  const MARKETING_AGENT_ID = 'c9690ace-eeef-41e0-9ed4-bdf78026df41';

  // Load prompt templates from agent endpoint
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch(`/api/agents/${MARKETING_AGENT_ID}/test/prompts`);
        const data = await response.json();
        setTemplates(data.defaultPrompts || []);
      } catch (err) {
        setError('Failed to load prompt categories');
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    loadTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a prompt or select a category');
      return;
    }
    
    setLoading(true);
    setError('');
    setResponse('');
    
    try {
      const response = await fetch(`/api/agents/${MARKETING_AGENT_ID}/test`, {
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
      
      if (!data.success) {
        setError(data.actualOutput || 'Request failed');
        return;
      }

      setResponse(data.actualOutput || 'No response received');
    } catch (err) {
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const buildEnhancedPrompt = () => {
    if (prompt.trim() && !Object.values(formData).some(v => v)) {
      return prompt; // Use custom prompt if no form data
    }
    
    let enhancedPrompt = `Find hotel recommendations for ${formData.location || 'any location'} from ${formData.checkIn || 'flexible dates'} to ${formData.checkOut || 'flexible dates'} for ${formData.guests} guests.`;
    
    if (formData.budget) enhancedPrompt += ` Budget: ${formData.budget}.`;
    if (formData.preferences) enhancedPrompt += ` Preferences: ${formData.preferences}.`;
    if (formData.eventType) enhancedPrompt += ` Event type: ${formData.eventType}.`;
    if (formData.eventName) enhancedPrompt += ` Event name: ${formData.eventName}.`;
    
    enhancedPrompt += ` Please provide recommendations organized in the following categories: Google Trends (trending hotels based on search data), Local Events (hotels near event venues), Budget Options (cost-effective choices), and Luxury Options (premium accommodations). Get hotel data from the mock database API and include real hotel information.`;
    
    return enhancedPrompt;
  };

  const handleRefresh = () => {
    setPrompt('');
    setResponse('');
    setError('');
    setFormData({
      location: '',
      checkIn: '',
      checkOut: '',
      guests: 1,
      budget: '',
      preferences: '',
      eventType: '',
      eventName: ''
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Hotel Recommendation Assistant
          </h1>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
        <p className="text-gray-600 mb-6">
          Select a category below or enter your own hotel requirements. All content filtering and recommendations are handled by the agent.
        </p>

        {/* Event-Based Hotel Search Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Basic Details */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Destination
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="City, Country"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                Budget Range
              </label>
              <select
                id="budget"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any Budget</option>
                <option value="budget">Budget ($0-100/night)</option>
                <option value="mid-range">Mid-range ($100-300/night)</option>
                <option value="luxury">Luxury ($300+/night)</option>
              </select>
            </div>

            <div>
              <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700 mb-2">
                Check-in Date
              </label>
              <input
                id="checkIn"
                type="date"
                value={formData.checkIn}
                onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700 mb-2">
                Check-out Date
              </label>
              <input
                id="checkOut"
                type="date"
                value={formData.checkOut}
                onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Event Information */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Event-Based Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select
                  id="eventType"
                  value={formData.eventType}
                  onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No specific event</option>
                  <option value="concert">Concert</option>
                  <option value="festival">Music Festival</option>
                  <option value="sports">Sports Event</option>
                  <option value="conference">Business Conference</option>
                  <option value="wedding">Wedding</option>
                  <option value="exhibition">Exhibition/Trade Show</option>
                </select>
              </div>

              <div>
                <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name (Optional)
                </label>
                <input
                  id="eventName"
                  type="text"
                  value={formData.eventName}
                  onChange={(e) => setFormData({...formData, eventName: e.target.value})}
                  placeholder="e.g., Coachella, UEFA Finals"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Preferences */}
          <div className="mb-6">
            <label htmlFor="preferences" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Preferences
            </label>
            <textarea
              id="preferences"
              value={formData.preferences}
              onChange={(e) => setFormData({...formData, preferences: e.target.value})}
              placeholder="Any special requirements or preferences..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* Custom Prompt Override */}
          <div className="mb-6">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Request (Override form data)
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Or enter your own custom hotel request..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          {/* Template Categories */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Categories:</h3>
            {loadingTemplates ? (
              <div className="text-gray-500">Loading categories...</div>
            ) : templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {templates.map((template, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setPrompt(template.prompt)}
                    className="text-left p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                  >
                    <div className="font-medium text-blue-800 text-sm mb-1">
                      {template.description}
                    </div>
                    <div className="text-gray-600 text-xs">
                      "{template.prompt.substring(0, 60)}..."
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No categories available</div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || (!prompt.trim() && !formData.location)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Getting Recommendations...' : 'Get Hotel Recommendations'}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Hotel Recommendations
            </h3>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-gray-700 font-sans">
                {response}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HotelPrompt;