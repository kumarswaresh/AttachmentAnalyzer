/**
 * Agent Platform SDK - JavaScript SDK for easy integration
 * Provides API key authentication, quota management, and monitoring
 */

class AgentPlatformSDK {
  constructor(config) {
    this.baseURL = config.baseURL || 'http://localhost:5000';
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
    this.rateLimitHandling = config.rateLimitHandling || 'wait';
    
    if (!this.apiKey) {
      throw new Error('API key is required');
    }
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    let lastError;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);
        
        if (response.status === 429) {
          if (this.rateLimitHandling === 'wait') {
            const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
            await this.sleep(retryAfter * 1000);
            continue;
          } else {
            throw new Error('Rate limit exceeded');
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt === this.retryAttempts) break;
        await this.sleep(1000 * attempt);
      }
    }
    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Agent Management
   */
  async listAgents() {
    return this.request('/api/agents');
  }

  async getAgent(agentId) {
    return this.request(`/api/agents/${agentId}`);
  }

  async createAgent(agentData) {
    return this.request('/api/agents', {
      method: 'POST',
      body: JSON.stringify(agentData)
    });
  }

  /**
   * Chat with Agent
   */
  async chatWithAgent(agentId, message, sessionId = null) {
    const body = {
      message,
      sessionId: sessionId || `session-${Date.now()}`
    };

    return this.request(`/api/agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Get Hotel Recommendations (Marketing Agent)
   */
  async getHotelRecommendations(criteria) {
    const marketingAgentId = 'testagent-marketing2';
    
    const prompt = `Find hotel recommendations based on these criteria:
Location: ${criteria.location || 'Any'}
Budget: ${criteria.budget || 'Any'}
Check-in: ${criteria.checkIn || 'Flexible'}
Check-out: ${criteria.checkOut || 'Flexible'}
Guests: ${criteria.guests || 1}
Preferences: ${criteria.preferences || 'Standard'}

Please provide 3-5 hotel recommendations with details about amenities, pricing, and why each hotel matches the criteria.`;

    return this.chatWithAgent(marketingAgentId, prompt);
  }

  /**
   * Monitoring and Analytics
   */
  async getUsageStats() {
    return this.request('/api/monitoring/stats');
  }

  async getAgentMetrics(agentId) {
    return this.request(`/api/oversight/metrics/${agentId}`);
  }

  /**
   * API Key Management
   */
  async validateApiKey() {
    try {
      await this.request('/api/auth/validate');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async getQuotaUsage() {
    return this.request('/api/auth/quota');
  }

  /**
   * Chain Execution
   */
  async executeChain(chainId, input, variables = {}) {
    return this.request(`/api/agent-chains/${chainId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input, variables })
    });
  }

  async getChainExecution(executionId) {
    return this.request(`/api/chain-executions/${executionId}`);
  }

  /**
   * Real-time Communication
   */
  createWebSocketConnection(agentId) {
    const protocol = window?.location?.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${this.baseURL.replace(/^https?:\/\//, '')}/ws/agents/${agentId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'auth',
        apiKey: this.apiKey
      }));
    };

    return ws;
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentPlatformSDK;
} else if (typeof window !== 'undefined') {
  window.AgentPlatformSDK = AgentPlatformSDK;
}

export default AgentPlatformSDK;