import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@/hooks/use-chat";
import { useAgent } from "@/hooks/use-agents";
import type { ChatMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ChatInterfaceProps {
  agentId: string;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isAgent = message.role === "agent";
  const timestamp = formatDistanceToNow(new Date(message.timestamp), { addSuffix: true });
  const fromCache = message.metadata?.fromCache;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-3xl ${isUser ? "order-1" : "order-2"}`}>
        {!isUser && (
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">🤖</span>
            </div>
            <span className="text-sm font-medium text-gray-700">Agent</span>
            {fromCache && (
              <Badge className="cache-indicator">
                ✨ from cache
              </Badge>
            )}
          </div>
        )}
        
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser 
              ? "bg-blue-600 text-white" 
              : "bg-gray-100 text-gray-900"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        
        <p className="text-xs text-gray-500 mt-1 px-1">
          {timestamp}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-3xl">
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">🤖</span>
          </div>
          <span className="text-sm font-medium text-gray-700">Agent</span>
        </div>
        
        <div className="bg-gray-100 rounded-lg px-4 py-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatInterface({ agentId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: agent } = useAgent(agentId);
  const { 
    messages, 
    isLoading, 
    isTyping, 
    isConnected, 
    sendMessage, 
    isSending,
    startNewSession 
  } = useChat(agentId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (input.trim() && !isSending) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-gray-200 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{agent?.name || "Agent"}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                <span>{isConnected ? "Connected" : "Disconnected"}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Model: {agent?.model?.replace("bedrock:", "").split("-")[0] || "Unknown"}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={startNewSession}>
              New Session
            </Button>
            <Button variant="ghost" size="sm">
              ⚙️
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <p>Start a conversation with the agent</p>
                <p className="text-sm mt-1">Type a message below to get started</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </ScrollArea>

        <div className="border-t border-gray-200 p-6">
          <div className="flex space-x-3">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="min-h-[60px] resize-none"
                disabled={isSending}
              />
            </div>
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="px-6"
            >
              {isSending ? "..." : "Send"}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Press Shift+Enter for new line</span>
            <span>Token limit: 4000</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
