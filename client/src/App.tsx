import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
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
import HotelDemo from "@/pages/hotel-demo";
import AgentCommunication from "@/pages/agent-communication";
import EnhancedMemory from "@/pages/enhanced-memory";
import ResponseSchemas from "@/pages/response-schemas";
import VisualAppBuilder from "@/pages/visual-app-builder";
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-0">
        <div className="lg:hidden h-16"></div> {/* Mobile header spacer */}
        <div className="container mx-auto px-4 py-8">
          <Switch>
            <Route path="/" component={AgentCatalog} />
            <Route path="/catalog" component={AgentCatalog} />
            <Route path="/mcp-catalog" component={MCPCatalog} />
            <Route path="/agent-builder" component={AgentBuilder} />
            <Route path="/chat" component={ChatConsole} />
            <Route path="/monitoring" component={Monitoring} />
            <Route path="/custom-models" component={CustomModels} />
            <Route path="/modules" component={ModuleLibrary} />
            <Route path="/api-management" component={APIManagement} />
            <Route path="/mcp-protocol" component={MCPProtocol} />
            <Route path="/agent-communication" component={AgentCommunication} />
            <Route path="/enhanced-memory" component={EnhancedMemory} />
            <Route path="/response-schemas" component={ResponseSchemas} />
            <Route path="/visual-app-builder" component={VisualAppBuilder} />
            <Route path="/hotel-demo" component={HotelDemo} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
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
