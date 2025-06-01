import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAgents, getAgent, createAgent, updateAgent, deleteAgent, executeAgent, getSystemStats, getRecentLogs, getModuleDefinitions } from "@/lib/agent-api";
import type { Agent, InsertAgent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAgents() {
  return useQuery({
    queryKey: ["/api/agents"],
    queryFn: getAgents,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ["/api/agents", id],
    queryFn: () => getAgent(id),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createAgent,
    onSuccess: (newAgent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent Created",
        description: `${newAgent.name} has been created successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create agent: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, agent }: { id: string; agent: Partial<InsertAgent> }) =>
      updateAgent(id, agent),
    onSuccess: (updatedAgent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", updatedAgent.id] });
      toast({
        title: "Agent Updated",
        description: `${updatedAgent.name} has been updated successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update agent: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent Deleted",
        description: "Agent has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete agent: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useExecuteAgent() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: string }) =>
      executeAgent(id, input),
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: `Agent execution failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useSystemStats() {
  return useQuery({
    queryKey: ["/api/monitoring/stats"],
    queryFn: getSystemStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useRecentLogs(limit: number = 50) {
  return useQuery({
    queryKey: ["/api/monitoring/logs", limit],
    queryFn: () => getRecentLogs(limit),
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useModuleDefinitions() {
  return useQuery({
    queryKey: ["/api/modules"],
    queryFn: getModuleDefinitions,
  });
}

export function useMCPCatalog() {
  return useQuery({
    queryKey: ["/api/mcp/catalog"],
    queryFn: () => fetch("/api/mcp/catalog").then(res => res.json()),
  });
}
