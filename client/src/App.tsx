import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
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
  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
