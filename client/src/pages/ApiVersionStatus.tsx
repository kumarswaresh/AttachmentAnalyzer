import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface EndpointTest {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  status: 'idle' | 'testing' | 'success' | 'error';
  responseTime?: number;
  error?: string;
  version?: string;
}

export default function ApiVersionStatus() {
  const [endpoints, setEndpoints] = useState<EndpointTest[]>([
    { name: 'Health Check', endpoint: '/api/health', method: 'GET', status: 'idle' },
    { name: 'Health Check (v1)', endpoint: '/api/v1/health', method: 'GET', status: 'idle' },
    { name: 'Marketing Demo (v1)', endpoint: '/api/v1/marketing/demo-campaign', method: 'GET', status: 'idle' },
    { name: 'Marketing Bedrock (v1)', endpoint: '/api/v1/marketing/demo-campaign-bedrock', method: 'GET', status: 'idle' },
    { name: 'User Profile (v1)', endpoint: '/api/v1/user/profile', method: 'GET', status: 'idle' },
    { name: 'Agents List (v1)', endpoint: '/api/v1/agents', method: 'GET', status: 'idle' },
    { name: 'Credentials List (v1)', endpoint: '/api/v1/credentials', method: 'GET', status: 'idle' },
  ]);

  const testEndpoint = async (endpoint: EndpointTest) => {
    const startTime = Date.now();
    
    setEndpoints(prev => prev.map(ep => 
      ep.endpoint === endpoint.endpoint 
        ? { ...ep, status: 'testing', error: undefined, responseTime: undefined }
        : ep
    ));

    try {
      const response = await fetch(endpoint.endpoint, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const responseTime = Date.now() - startTime;
      const apiVersion = response.headers.get('X-API-Version');

      setEndpoints(prev => prev.map(ep => 
        ep.endpoint === endpoint.endpoint 
          ? { 
              ...ep, 
              status: response.ok ? 'success' : 'error',
              responseTime,
              version: apiVersion || undefined,
              error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
            }
          : ep
      ));
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setEndpoints(prev => prev.map(ep => 
        ep.endpoint === endpoint.endpoint 
          ? { 
              ...ep, 
              status: 'error',
              responseTime,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          : ep
      ));
    }
  };

  const testAllEndpoints = async () => {
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const getStatusIcon = (status: EndpointTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'testing':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: EndpointTest['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Version Status</h1>
          <p className="text-muted-foreground">
            Test API endpoints to verify versioning implementation
          </p>
        </div>
        <Button onClick={testAllEndpoints} size="lg">
          Test All Endpoints
        </Button>
      </div>

      <div className="grid gap-4">
        {endpoints.map((endpoint) => (
          <Card key={endpoint.endpoint}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getStatusIcon(endpoint.status)}
                  {endpoint.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {endpoint.version && (
                    <Badge variant="outline">v{endpoint.version}</Badge>
                  )}
                  {getStatusBadge(endpoint.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{endpoint.method}</Badge>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {endpoint.endpoint}
                    </code>
                  </div>
                  {endpoint.responseTime && (
                    <p className="text-sm text-muted-foreground">
                      Response time: {endpoint.responseTime}ms
                    </p>
                  )}
                  {endpoint.error && (
                    <p className="text-sm text-red-600">
                      Error: {endpoint.error}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testEndpoint(endpoint)}
                  disabled={endpoint.status === 'testing'}
                >
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Versioning Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {endpoints.filter(ep => ep.status === 'success').length}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {endpoints.filter(ep => ep.status === 'error').length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {endpoints.filter(ep => ep.status === 'idle').length}
              </div>
              <div className="text-sm text-muted-foreground">Not Tested</div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Implementation Notes:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All new APIs use /api/v1 prefix</li>
              <li>• Legacy endpoints redirect to versioned APIs</li>
              <li>• X-API-Version header indicates current version</li>
              <li>• Swagger documentation updated for v1 endpoints</li>
              <li>• Frontend automatically versions API calls</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}