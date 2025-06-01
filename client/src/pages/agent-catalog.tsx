import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AgentCard } from "@/components/agent-card";
import { useAgents, useSystemStats, useExecuteAgent, useDeleteAgent } from "@/hooks/use-agents";
import { Link } from "wouter";
import { Settings } from "lucide-react";
import type { Agent } from "@shared/schema";

export default function AgentCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: stats } = useSystemStats();
  const executeAgent = useExecuteAgent();
  const deleteAgent = useDeleteAgent();

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.goal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExecuteAgent = async (agent: Agent) => {
    const input = prompt(`Enter input for ${agent.name}:`);
    if (input) {
      try {
        const result = await executeAgent.mutateAsync({ id: agent.id, input });
        alert(`Execution completed in ${result.duration}ms\n\nOutput: ${result.output.substring(0, 200)}...`);
      } catch (error) {
        console.error("Execution failed:", error);
      }
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (confirm(`Are you sure you want to delete ${agent.name}?`)) {
      await deleteAgent.mutateAsync(agent.id);
    }
  };

  if (agentsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Catalog</h1>
            <p className="text-gray-600 mt-2">Manage and deploy your AI agents</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading agents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Catalog</h1>
          <p className="text-gray-600 mt-2">Manage and deploy your AI agents across the platform</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <a href="/mcp-protocol">
              <Settings className="h-4 w-4 mr-2" />
              MCP Protocol
            </a>
          </Button>
          <Link href="/builder">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <span className="mr-2">+</span>
              Create New Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Active Agents</p>
                  <p className="metric-value">{stats.activeAgents}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">▶️</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Total Executions</p>
                  <p className="metric-value">{stats.totalExecutions?.toLocaleString() || '0'}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Success Rate</p>
                  <p className="metric-value">{stats?.successRate?.toFixed(1) || '0.0'}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Avg Response Time</p>
                  <p className="metric-value">{stats?.averageResponseTime?.toFixed(1) || '0.0'}s</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-xl">⏱️</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search agents by name or goal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent Grid */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🤖</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {agents.length === 0 ? "No agents created yet" : "No agents match your filters"}
          </h3>
          <p className="text-gray-600 mb-6">
            {agents.length === 0 
              ? "Get started by creating your first AI agent"
              : "Try adjusting your search terms or filters"
            }
          </p>
          {agents.length === 0 && (
            <Link href="/builder">
              <Button>Create Your First Agent</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onExecute={handleExecuteAgent}
              onDelete={handleDeleteAgent}
              onViewDetails={(agent) => {
                alert(`Agent Details:\n\nName: ${agent.name}\nGoal: ${agent.goal}\nRole: ${agent.role}\nModel: ${agent.model}\nModules: ${agent.modules.length}`);
              }}
              onEdit={(agent) => {
                alert(`Edit functionality would open agent builder with agent ID: ${agent.id}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
