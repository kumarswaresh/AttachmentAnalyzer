import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity, 
  Search, 
  CloudRain, 
  TrendingUp, 
  MapPin, 
  Webhook,
  RefreshCw,
  Play,
  AlertTriangle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ConnectorTest {
  test: string;
  status: 'passed' | 'failed' | 'running';
  message: string;
  timestamp: string;
  data?: any;
  error?: string;
}

interface ConnectorTestResult {
  connectorId: string;
  name: string;
  status: 'success' | 'warning' | 'error';
  capabilities: string[];
  endpoints: number;
  tests: ConnectorTest[];
}

interface MCPConnector {
  id: string;
  name: string;
  version: string;
  status: string;
  description: string;
  capabilities: string[];
  category: string;
  type: string;
  lastActivity: string;
}

const getConnectorIcon = (connectorId: string) => {
  switch (connectorId) {
    case 'serpapi': return <Search className="h-5 w-5" />;
    case 'weather': return <CloudRain className="h-5 w-5" />;
    case 'google-trends': return <TrendingUp className="h-5 w-5" />;
    case 'geospatial': return <MapPin className="h-5 w-5" />;
    case 'api-trigger': return <Webhook className="h-5 w-5" />;
    default: return <Activity className="h-5 w-5" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': case 'passed': return 'text-green-600 dark:text-green-400';
    case 'warning': return 'text-yellow-600 dark:text-yellow-400';
    case 'error': case 'failed': return 'text-red-600 dark:text-red-400';
    case 'running': return 'text-blue-600 dark:text-blue-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success': case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'error': case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    default: return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

export default function ConnectionTesting() {
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectorTestResult>>({});
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch available connectors
  const { data: connectors, isLoading: connectorsLoading } = useQuery<MCPConnector[]>({
    queryKey: ['/api/mcp-connectors'],
  });

  // Test individual connector
  const testConnectorMutation = useMutation({
    mutationFn: async ({ connectorId, testType }: { connectorId: string; testType: string }) => {
      const response = await apiRequest('POST', `/api/mcp-connectors/${connectorId}/test`, { testType });
      return await response.json();
    },
    onMutate: ({ connectorId }) => {
      setRunningTests(prev => new Set([...prev, connectorId]));
    },
    onSuccess: (data, { connectorId }) => {
      setTestResults(prev => ({ ...prev, [connectorId]: data }));
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectorId);
        return newSet;
      });
    },
    onError: (error: any, { connectorId }) => {
      setTestResults(prev => ({
        ...prev,
        [connectorId]: {
          connectorId,
          name: connectors?.find(c => c.id === connectorId)?.name || connectorId,
          status: 'error',
          capabilities: [],
          endpoints: 0,
          tests: [{
            test: 'connection_test',
            status: 'failed',
            message: error.message || 'Connection test failed',
            timestamp: new Date().toISOString(),
            error: error.message
          }]
        }
      }));
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectorId);
        return newSet;
      });
    }
  });

  // Test all connectors
  const testAllConnectors = async (testType: string = 'basic') => {
    if (!connectors) return;
    
    for (const connector of connectors) {
      await testConnectorMutation.mutateAsync({ 
        connectorId: connector.id, 
        testType 
      });
    }
  };

  const getOverallProgress = () => {
    if (!connectors) return 0;
    const tested = Object.keys(testResults).length;
    const running = runningTests.size;
    return Math.round(((tested + running) / connectors.length) * 100);
  };

  if (connectorsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connection Testing</h1>
          <p className="text-muted-foreground">
            Test MCP connector connections and verify API functionality
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => testAllConnectors('basic')}
            disabled={runningTests.size > 0}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Test All (Basic)
          </Button>
          <Button
            onClick={() => testAllConnectors('full')}
            disabled={runningTests.size > 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Test All (Full)
          </Button>
        </div>
      </div>

      {(runningTests.size > 0 || Object.keys(testResults).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Testing Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{getOverallProgress()}%</span>
              </div>
              <Progress value={getOverallProgress()} />
              {runningTests.size > 0 && (
                <p className="text-sm text-muted-foreground">
                  Testing {runningTests.size} connector{runningTests.size > 1 ? 's' : ''}...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="connectors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectors?.map((connector) => {
              const isRunning = runningTests.has(connector.id);
              const result = testResults[connector.id];
              
              return (
                <Card 
                  key={connector.id} 
                  className={`cursor-pointer transition-all ${
                    selectedConnector === connector.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedConnector(connector.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getConnectorIcon(connector.id)}
                        <CardTitle className="text-lg">{connector.name}</CardTitle>
                      </div>
                      {result && getStatusIcon(result.status)}
                      {isRunning && !result && (
                        <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {connector.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{connector.category}</Badge>
                      <Badge variant="outline">v{connector.version}</Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>{connector.capabilities.length}</strong> capabilities available
                    </div>

                    {result && (
                      <Alert>
                        <AlertTitle className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          Test Result
                        </AlertTitle>
                        <AlertDescription>
                          {result.tests.length} test{result.tests.length > 1 ? 's' : ''} completed
                          {result.status === 'warning' && ' with warnings'}
                          {result.status === 'error' && ' with errors'}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnectorMutation.mutate({ 
                            connectorId: connector.id, 
                            testType: 'basic' 
                          });
                        }}
                        disabled={isRunning}
                        className="flex-1"
                      >
                        {isRunning ? 'Testing...' : 'Test Basic'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnectorMutation.mutate({ 
                            connectorId: connector.id, 
                            testType: 'full' 
                          });
                        }}
                        disabled={isRunning}
                        className="flex-1"
                      >
                        Test Full
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {Object.keys(testResults).length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="font-semibold">No test results yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Run connector tests to see detailed results here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.values(testResults).map((result) => (
                <Card key={result.connectorId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getConnectorIcon(result.connectorId)}
                        <CardTitle>{result.name}</CardTitle>
                        <Badge 
                          variant={result.status === 'success' ? 'default' : 
                                  result.status === 'warning' ? 'secondary' : 'destructive'}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.endpoints} endpoint{result.endpoints > 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {result.tests.map((test, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(test.status)}
                                <span className="font-medium capitalize">
                                  {test.test.replace('_', ' ')}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(test.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            
                            <p className={`text-sm ${getStatusColor(test.status)}`}>
                              {test.message}
                            </p>
                            
                            {test.data && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <strong>Response Data:</strong>
                                <pre className="mt-1 whitespace-pre-wrap">
                                  {JSON.stringify(test.data, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            {test.error && (
                              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                                <strong>Error:</strong> {test.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}