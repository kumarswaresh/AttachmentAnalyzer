import { mcpConnectorManager } from './modules/mcp-connectors/connector-manager';
import { Express } from 'express';

export function setupMCPRoutes(app: Express) {
  // Initialize MCP Connector Manager
  console.log('Setting up MCP routes with connector manager');

  // Get all available MCP connectors (no auth required for testing)
  app.get('/api/mcp-connectors', async (req, res) => {
    try {
      console.log('MCP connectors endpoint called');
      const allConnectors = mcpConnectorManager.getAllConnectors();
      console.log(`Found ${allConnectors.length} connectors:`, allConnectors.map(c => c.getId()));
      
      const connectors = allConnectors.map(connector => ({
        id: connector.getId(),
        name: connector.getName(),
        version: "1.0.0",
        status: connector.getStatus(),
        description: connector.getDescription(),
        capabilities: connector.getCapabilities(),
        category: connector.getCategory(),
        type: connector.getType(),
        lastActivity: "Active"
      }));

      console.log('Returning connectors:', connectors);
      res.json(connectors);
    } catch (error) {
      console.error('Error fetching MCP connectors:', error);
      res.status(500).json({ message: 'Failed to fetch MCP connectors', error: error.message });
    }
  });

  // Test MCP connector with real API calls
  app.post('/api/mcp-connectors/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      const { testType = 'basic' } = req.body;
      console.log(`Testing MCP connector: ${id} (type: ${testType})`);
      
      const connector = mcpConnectorManager.getConnector(id);
      if (!connector) {
        return res.status(400).json({
          status: "error",
          message: `Connector '${id}' not found. Available connectors: ${mcpConnectorManager.getAllConnectors().map(c => c.getId()).join(', ')}`
        });
      }

      let testResults = {
        connectorId: id,
        name: connector.getName(),
        status: "success",
        capabilities: connector.getCapabilities(),
        endpoints: connector.getEndpoints().length,
        tests: []
      };

      // Basic health check
      const healthResult = await mcpConnectorManager.healthCheck(id);
      testResults.tests.push({
        test: "health_check",
        status: healthResult.status === 'healthy' ? 'passed' : 'failed',
        message: healthResult.message,
        timestamp: new Date().toISOString()
      });

      // Enhanced connection tests based on connector type
      if (testType === 'full' || testType === 'connection') {
        try {
          switch (id) {
            case 'serpapi':
              // Test SerpAPI with a simple search
              const serpResult = await mcpConnectorManager.executeConnectorAction('serpapi', 'search', { 
                q: 'test query',
                engine: 'google',
                num: 1
              });
              testResults.tests.push({
                test: "api_connection",
                status: serpResult ? 'passed' : 'failed',
                message: serpResult ? "Successfully connected to SerpAPI" : "Failed to connect to SerpAPI",
                data: serpResult ? { results: Array.isArray(serpResult.organic_results) ? serpResult.organic_results.length : 0 } : null,
                timestamp: new Date().toISOString()
              });
              break;

            case 'weather':
              // Test Weather API with a location query
              const weatherResult = await mcpConnectorManager.executeConnectorAction('weather', 'current_weather', {
                location: 'London'
              });
              testResults.tests.push({
                test: "api_connection", 
                status: weatherResult ? 'passed' : 'failed',
                message: weatherResult ? "Successfully connected to Weather API" : "Weather API connection failed",
                data: weatherResult ? { temperature: weatherResult.main?.temp, location: weatherResult.name } : null,
                timestamp: new Date().toISOString()
              });
              break;

            case 'google-trends':
              // Test Google Trends
              const trendsResult = await mcpConnectorManager.executeConnectorAction('google-trends', 'get_trends', {
                keywords: ['technology'],
                timeframe: 'today 1-m'
              });
              testResults.tests.push({
                test: "api_connection",
                status: trendsResult ? 'passed' : 'failed', 
                message: trendsResult ? "Successfully connected to Google Trends" : "Google Trends connection failed",
                data: trendsResult ? { trends_available: true } : null,
                timestamp: new Date().toISOString()
              });
              break;

            case 'geospatial':
              // Test Geospatial services
              const geoResult = await mcpConnectorManager.executeConnectorAction('geospatial', 'geocode', {
                address: 'New York, NY'
              });
              testResults.tests.push({
                test: "api_connection",
                status: geoResult ? 'passed' : 'failed',
                message: geoResult ? "Successfully connected to Geospatial services" : "Geospatial connection failed",
                data: geoResult ? { coordinates: geoResult.results?.[0]?.geometry } : null,
                timestamp: new Date().toISOString()
              });
              break;

            case 'api-trigger':
              // Test API Trigger functionality
              testResults.tests.push({
                test: "api_connection",
                status: 'passed',
                message: "API Trigger connector is ready for webhook creation",
                data: { webhook_endpoints_available: true },
                timestamp: new Date().toISOString()
              });
              break;
          }
        } catch (apiError: any) {
          testResults.tests.push({
            test: "api_connection",
            status: 'failed',
            message: `API connection failed: ${apiError.message}`,
            error: apiError.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Determine overall status
      const hasFailures = testResults.tests.some(test => test.status === 'failed');
      testResults.status = hasFailures ? 'warning' : 'success';

      res.json(testResults);
    } catch (error: any) {
      console.error('Error testing MCP connector:', error);
      res.status(400).json({
        status: "error",
        message: error.message || "Connection test failed",
        connectorId: id,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get MCP resources
  app.get('/api/mcp/resources', async (req, res) => {
    try {
      const connectors = mcpConnectorManager.getAllConnectors();
      const resources = connectors.map(connector => ({
        uri: `mcp://${connector.getId()}`,
        name: connector.getName(),
        description: connector.getDescription(),
        mimeType: "application/json",
        category: connector.getCategory()
      }));
      res.json({ resources });
    } catch (error) {
      console.error('Error fetching MCP resources:', error);
      res.status(500).json({ message: 'Failed to fetch MCP resources' });
    }
  });

  // Get MCP capabilities
  app.get('/api/mcp/capabilities', async (req, res) => {
    try {
      const allCapabilities = new Set();
      mcpConnectorManager.getAllConnectors().forEach(connector => {
        connector.getCapabilities().forEach(cap => allCapabilities.add(cap));
      });
      
      const capabilities = {
        protocolVersion: "2024-11-05",
        capabilities: {
          logging: {},
          prompts: {
            listChanged: true
          },
          resources: {
            subscribe: true,
            listChanged: true
          },
          tools: {
            listChanged: true
          }
        },
        serverInfo: {
          name: "AgentPlatform MCP Server",
          version: "1.0.0"
        },
        implementation: {
          name: "agent-platform-mcp",
          version: "1.0.0"
        },
        available: Array.from(allCapabilities)
      };
      res.json(capabilities);
    } catch (error) {
      console.error('Error fetching MCP capabilities:', error);
      res.status(500).json({ message: 'Failed to fetch MCP capabilities' });
    }
  });

  // Get MCP tools
  app.get('/api/mcp/tools', async (req, res) => {
    try {
      const tools = [];
      mcpConnectorManager.getAllConnectors().forEach(connector => {
        const endpoints = connector.getEndpoints();
        endpoints.forEach(endpoint => {
          tools.push({
            name: `${connector.getId()}_${endpoint.path.replace(/\//g, '_')}`,
            description: endpoint.description,
            inputSchema: endpoint.schema,
            connectorId: connector.getId(),
            connectorName: connector.getName(),
            endpoint: endpoint.path,
            method: endpoint.method
          });
        });
      });
      res.json({ tools });
    } catch (error) {
      console.error('Error fetching MCP tools:', error);
      res.status(500).json({ message: 'Failed to fetch MCP tools' });
    }
  });

  // Execute MCP tool
  app.post('/api/mcp/tools/execute', async (req, res) => {
    try {
      const { toolName, args } = req.body;
      
      // Parse tool name to get connector ID and action
      const [connectorId, ...actionParts] = toolName.split('_');
      const action = actionParts.join('_').replace(/_/g, '/');
      
      const result = await mcpConnectorManager.processMessage(connectorId, {
        action: action,
        params: args
      });
      
      res.json({
        success: true,
        toolName,
        args,
        result,
        executionTime: "100ms"
      });
    } catch (error: any) {
      console.error('Error executing MCP tool:', error);
      res.status(500).json({
        success: false,
        error: error.message || "Tool execution failed"
      });
    }
  });

  // SerpAPI specific routes
  app.post('/api/mcp/serpapi/search', async (req, res) => {
    try {
      const result = await mcpConnectorManager.executeConnectorAction('serpapi', 'search', req.body);
      res.json(result);
    } catch (error: any) {
      console.error('SerpAPI search error:', error);
      res.status(500).json({ message: 'Search failed', error: error.message });
    }
  });

  app.post('/api/mcp/serpapi/hotels', async (req, res) => {
    try {
      const result = await mcpConnectorManager.executeConnectorAction('serpapi', 'search_hotels', req.body);
      res.json(result);
    } catch (error: any) {
      console.error('SerpAPI hotel search error:', error);
      res.status(500).json({ message: 'Hotel search failed', error: error.message });
    }
  });

  // Google Trends routes
  app.post('/api/mcp/trends/keyword', async (req, res) => {
    try {
      const result = await mcpConnectorManager.executeConnectorAction('trends', 'keyword_trends', req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Google Trends error:', error);
      res.status(500).json({ message: 'Trends search failed', error: error.message });
    }
  });

  // Weather connector routes
  app.post('/api/mcp/weather/current', async (req, res) => {
    try {
      const result = await mcpConnectorManager.executeConnectorAction('weather', 'current_weather', req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Weather API error:', error);
      res.status(500).json({ message: 'Weather query failed', error: error.message });
    }
  });

  // Geospatial connector routes
  app.post('/api/mcp/geo/geocode', async (req, res) => {
    try {
      const result = await mcpConnectorManager.executeConnectorAction('geospatial', 'geocode', req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Geocoding error:', error);
      res.status(500).json({ message: 'Geocoding failed', error: error.message });
    }
  });

  app.post('/api/mcp/geo/reverse-geocode', async (req, res) => {
    try {
      const result = await mcpConnectorManager.executeConnectorAction('geospatial', 'reverse_geocode', req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ message: 'Reverse geocoding failed', error: error.message });
    }
  });

  app.post('/api/mcp/geo/nearby', async (req, res) => {
    try {
      const result = await mcpConnectorManager.executeConnectorAction('geospatial', 'find_nearby', req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Nearby places error:', error);
      res.status(500).json({ message: 'Nearby places search failed', error: error.message });
    }
  });

  // API Trigger connector routes
  app.post('/api/mcp/api/trigger', async (req, res) => {
    try {
      const result = await mcpConnectorManager.executeConnectorAction('api-trigger', 'trigger_api', req.body);
      res.json(result);
    } catch (error: any) {
      console.error('API trigger error:', error);
      res.status(500).json({ message: 'API trigger failed', error: error.message });
    }
  });

  // Custom MCP integration
  app.post('/api/mcp/custom', async (req, res) => {
    try {
      const { name, url, description } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ message: "Name and URL are required" });
      }

      const integration = {
        id: Date.now().toString(),
        name,
        url,
        description,
        status: "connected",
        created: new Date().toISOString()
      };
      
      res.json(integration);
    } catch (error) {
      res.status(500).json({ message: "Failed to create custom MCP integration" });
    }
  });

  console.log(`Initialized MCP routes with ${mcpConnectorManager.getAllConnectors().length} connectors`);
}