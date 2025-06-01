import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createChatSession, getChatMessages, sendChatMessage, createWebSocketConnection } from "@/lib/agent-api";
import type { ChatSession, ChatMessage, InsertChatSession } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useChat(agentId: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create chat session
  const createSession = useMutation({
    mutationFn: (session: InsertChatSession) => createChatSession(session),
    onSuccess: (session) => {
      setSessionId(session.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create chat session: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Get chat messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/chat/sessions", sessionId, "messages"],
    queryFn: () => getChatMessages(sessionId!),
    enabled: !!sessionId,
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      sendChatMessage(sessionId!, { role: "user", content }),
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: (result) => {
      // Update messages cache
      queryClient.setQueryData(
        ["/api/chat/sessions", sessionId, "messages"],
        (oldMessages: ChatMessage[] = []) => {
          const newMessages = [...oldMessages, result.userMessage];
          if (result.agentMessage) {
            newMessages.push(result.agentMessage);
          }
          return newMessages;
        }
      );
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Initialize chat session on mount
  useEffect(() => {
    if (agentId && !sessionId) {
      createSession.mutate({
        agentId,
        status: "active",
      });
    }
  }, [agentId, sessionId]);

  // Set up WebSocket connection
  useEffect(() => {
    if (sessionId) {
      const websocket = createWebSocketConnection();
      
      websocket.onopen = () => {
        setWs(websocket);
        // Subscribe to session updates
        websocket.send(JSON.stringify({
          type: "subscribe_session",
          sessionId,
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "new_message") {
            // Update messages cache with real-time message
            queryClient.setQueryData(
              ["/api/chat/sessions", sessionId, "messages"],
              (oldMessages: ChatMessage[] = []) => [...oldMessages, data.message]
            );
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      websocket.onclose = () => {
        setWs(null);
      };

      return () => {
        websocket.close();
      };
    }
  }, [sessionId, queryClient]);

  const startNewSession = useCallback(() => {
    setSessionId(null);
    queryClient.removeQueries({ 
      queryKey: ["/api/chat/sessions", sessionId, "messages"] 
    });
  }, [sessionId, queryClient]);

  return {
    sessionId,
    messages,
    isLoading,
    isTyping,
    isConnected: !!ws,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    startNewSession,
  };
}
