import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemStats, useRecentLogs, useAgents } from "@/hooks/use-agents";
import { formatDistanceToNow } from "date-fns";

export default function Monitoring() {
  const [logFilter, setLogFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { data: stats } = useSystemStats();
  const { data: logs = [] } = useRecentLogs(100);
  const { data: agents = [] } = useAgents();

  const filteredLogs = logs.filter(log => {
    if (logFilter === "all") return true;
    return log.status === logFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const activeAgents = agents.filter(agent => agent.status === "active");
  const idleAgents = agents.filter(agent => agent.status === "idle");
  const errorAgents = agents.filter(agent => agent.status === "error");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600 mt-2">Real-time agent performance and system health monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "🔄 Auto Refresh On" : "⏸️ Auto Refresh Off"}
          </Button>
        </div>
      </div>

      {/* System Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Success Rate</p>
                  <p className="metric-value">{stats.successRate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="progress-bar">
                  <div 
                    className="progress-fill progress-success" 
                    style={{ width: `${stats.successRate}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Avg Response Time</p>
                  <p className="metric-value">{stats.averageResponseTime.toFixed(1)}s</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">⏱️</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${
                      stats.averageResponseTime < 2 ? "progress-success" :
                      stats.averageResponseTime < 5 ? "progress-warning" : "progress-danger"
                    }`}
                    style={{ width: `${Math.min(100, (10 / Math.max(stats.averageResponseTime, 0.1)) * 10)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Total Executions</p>
                  <p className="metric-value">{stats.totalExecutions.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Active Agents</p>
                  <p className="metric-value">{stats.activeAgents}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-xl">🤖</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Execution Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Agent Execution Logs</CardTitle>
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p>No logs found</p>
                  <p className="text-sm mt-1">Try adjusting your filter</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      log.status === "success" ? "bg-green-500" :
                      log.status === "error" ? "bg-red-500" :
                      log.status === "running" ? "bg-blue-500" : "bg-gray-500"
                    }`}></div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Agent ID: {log.agentId.substring(0, 8)}...
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        Execution ID: {log.executionId.substring(0, 8)}...
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        {getStatusBadge(log.status)}
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          {log.duration && <span>{log.duration}ms</span>}
                          {log.metadata?.fromCache && (
                            <span className="cache-indicator">✨ cached</span>
                          )}
                        </div>
                      </div>
                      
                      {log.errorMessage && (
                        <p className="text-xs text-red-600 mt-1 truncate">
                          Error: {log.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agent Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{activeAgents.length}</div>
                  <div className="text-sm text-green-700">Active</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{idleAgents.length}</div>
                  <div className="text-sm text-yellow-700">Idle</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{errorAgents.length}</div>
                  <div className="text-sm text-red-700">Error</div>
                </div>
              </div>

              {/* Top Performing Agents */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Top Performing Agents</h4>
                <div className="space-y-3">
                  {activeAgents.slice(0, 3).map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">🤖</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{agent.name}</p>
                          <p className="text-xs text-gray-600">
                            Updated {formatDistanceToNow(new Date(agent.updatedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800">
                          ● Active
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {activeAgents.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <p>No active agents</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
