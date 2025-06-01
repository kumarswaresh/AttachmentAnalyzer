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

  const MARKETING_AGENT_ID = 'c9690ace-eeef-41e0-9ed4-bdf78026df41';

  // Load prompt templates from agent endpoint
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/agents/${MARKETING_AGENT_ID}/test/prompts`);
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
      const response = await fetch(`http://localhost:5000/api/agents/${MARKETING_AGENT_ID}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'custom',
          prompt: prompt
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

  const handleRefresh = () => {
    setPrompt('');
    setResponse('');
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Hotel Recommendation Assistant
        </h1>
        <p className="text-gray-600 mb-6">
          Ask for hotel recommendations using natural language. Be specific about your destination, dates, budget, and preferences.
        </p>

        {/* Sample Prompts */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Prompts:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {samplePrompts.map((sample, index) => (
              <button
                key={index}
                onClick={() => setPrompt(sample)}
                className="text-left p-2 text-sm bg-blue-50 hover:bg-blue-100 rounded border text-blue-700 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Your Hotel Request
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: I need a 4-star hotel in New York for 2 nights next week, with a gym and near Central Park. My budget is $200-300 per night."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              required
            />
            <div className="text-sm text-gray-500 mt-1">
              {prompt.length}/500 characters
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
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

        {/* Safety Notice */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">Safety Guidelines</h4>
          <p className="text-sm text-yellow-700">
            This assistant is designed for hotel recommendations only. Inappropriate, harmful, or unrelated requests will be rejected. 
            Please keep your requests professional and travel-related.
          </p>
        </div>
      </div>
    </div>
  );
}

export default HotelPrompt;