import { mcpConnectorManager } from './modules/mcp-connectors/connector-manager';
import { Express } from 'express';

export function setupMCPRoutes(app: Express) {
  // Initialize MCP Connector Manager
  console.log('Setting up MCP routes with connector manager');

  // Get all available MCP connectors
  app.get('/api/mcp-connectors', async (req, res) => {
    try {
      const connectors = mcpConnectorManager.getAllConnectors().map(connector => ({
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

      res.json(connectors);
    } catch (error) {
      console.error('Error fetching MCP connectors:', error);
      res.status(500).json({ message: 'Failed to fetch MCP connectors' });
    }
  });

  // Test MCP connector health
  app.post('/api/mcp-connectors/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await mcpConnectorManager.healthCheck(id);
      
      if (result.status === 'unhealthy') {
        return res.status(400).json({
          status: "error",
          message: result.message || "Connector health check failed"
        });
      }
      
      res.json({
        status: "success",
        message: result.message || "Connector is operational",
        connectorId: id,
        name: mcpConnectorManager.getConnector(id)?.getName()
      });
    } catch (error: any) {
      console.error('Error testing MCP connector:', error);
      res.status(400).json({
        status: "error",
        message: error.message || "Unknown connector"
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