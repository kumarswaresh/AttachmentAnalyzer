import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "@/pages/login";
import AgentCatalog from "@/pages/agent-catalog";
import MCPCatalog from "@/pages/mcp-catalog";
import AgentBuilder from "@/pages/agent-builder";
import ChatConsole from "@/pages/chat-console";
import Monitoring from "@/pages/monitoring";
import CustomModels from "@/pages/custom-models";
import APIManagement from "@/pages/api-management";
import ModuleLibrary from "@/pages/module-library";
import MCPProtocol from "@/pages/mcp-protocol";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={AgentCatalog} />
          <Route path="/catalog" component={MCPCatalog} />
          <Route path="/builder" component={AgentBuilder} />
          <Route path="/chat" component={ChatConsole} />
          <Route path="/monitoring" component={Monitoring} />
          <Route path="/custom-models" component={CustomModels} />
          <Route path="/modules" component={ModuleLibrary} />
          <Route path="/api-management" component={APIManagement} />
          <Route path="/mcp-protocol" component={MCPProtocol} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50">
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
