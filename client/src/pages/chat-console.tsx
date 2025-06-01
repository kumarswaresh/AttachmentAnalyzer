import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "@/components/chat-interface";
import { useAgents } from "@/hooks/use-agents";
import type { Agent } from "@shared/schema";

export default function ChatConsole() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { data: agents = [], isLoading } = useAgents();

  // Filter only active agents for chat
  const activeAgents = agents.filter(agent => agent.status === "active");

  const getAgentIcon = (name: string) => {
    if (name.toLowerCase().includes("marketing")) return "📈";
    if (name.toLowerCase().includes("release") || name.toLowerCase().includes("notes")) return "📝";
    if (name.toLowerCase().includes("code")) return "⌨️";
    if (name.toLowerCase().includes("data")) return "📊";
    return "🤖";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chat Console</h1>
          <p className="text-gray-600 mt-2">Interact with your agents in real-time</p>
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chat Console</h1>
        <p className="text-gray-600 mt-2">Interact with your agents in real-time and test their capabilities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Agent Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Available Agents</span>
                <Badge variant="outline">{activeAgents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAgents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <p className="text-gray-600 text-sm">No active agents available</p>
                </div>
              ) : (
                activeAgents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAgent?.id === agent.id
                        ? "border border-blue-300 bg-blue-50"
                        : "border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">{getAgentIcon(agent.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{agent.name}</p>
                        <p className="text-xs text-gray-600 truncate">
                          {agent.model.replace("bedrock:", "").split("-")[0]}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {agent.goal}
                    </p>
                  </div>
                ))
              )}

              {/* Quick Actions */}
              {activeAgents.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                    >
                      <span className="mr-2">📜</span>
                      Chat History
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                    >
                      <span className="mr-2">💾</span>
                      Save Session
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                    >
                      <span className="mr-2">📥</span>
                      Export Chat
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          {selectedAgent ? (
            <ChatInterface agentId={selectedAgent.id} />
          ) : (
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">💬</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Agent to Start Chatting</h3>
                  <p className="text-gray-600 max-w-md">
                    Choose an agent from the sidebar to begin a conversation. You can test agent capabilities, 
                    ask questions, and see real-time responses with vector cache indicators.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
