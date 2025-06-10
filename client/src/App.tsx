import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AgentCatalog from "@/pages/agent-catalog";

import MCPProtocol from "@/pages/mcp-protocol";
import AgentBuilder from "@/pages/agent-builder";
import ChatConsole from "@/pages/chat-console";
import Monitoring from "@/pages/monitoring";
import CustomModels from "@/pages/custom-models";
import APIManagement from "@/pages/api-management";
import ModuleLibrary from "@/pages/module-library";
import HotelDemo from "@/pages/hotel-demo";
import AgentCommunication from "@/pages/agent-communication";
import EnhancedAgentAppBuilder from "@/pages/enhanced-agent-app-builder";
import VisualAgentAppBuilder from "@/pages/visual-agent-app-builder";
import AgentAppCatalog from "@/pages/agent-app-catalog";
import AgentRealtimeMonitor from "@/pages/agent-realtime-monitor";
import CredentialsManagement from "@/pages/credentials-management";
import DemoWorkflow from "@/pages/demo-workflow";
import DeploymentManagement from "@/pages/deployment-management";
import UserManagement from "@/pages/user-management-complete";
import AdminDashboard from "@/pages/admin-dashboard";
import Dashboard from "@/pages/dashboard";
import AdminCreditManagement from "@/pages/admin-credit-management";
import EmailTemplates from "@/pages/email-templates";
import OrganizationManagement from "@/pages/organization-management";
import BillingManagement from "@/pages/billing-management";
import ConnectionTesting from "@/pages/connection-testing";
import NotFound from "@/pages/not-found";

function HomeRoute() {
  const { user } = useAuth();
  
  // SuperAdmin sees admin dashboard by default
  if (user?.role === 'admin' || user?.username === 'admin') {
    return <AdminDashboard />;
  }
  
  // Regular users and client admins see agent app catalog
  return <AgentAppCatalog />;
}

function ProtectedRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show auth pages for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Redirect authenticated users away from auth pages
  if (location === "/login" || location === "/register") {
    return <HomeRoute />;
  }

  // Show protected app layout
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-0">
        <div className="lg:hidden h-16"></div> {/* Mobile header spacer */}
        <div className="container mx-auto px-4 py-8">
          <Switch>
            <Route path="/" component={HomeRoute} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/admin-dashboard" component={AdminDashboard} />
            <Route path="/agent-catalog" component={AgentCatalog} />

            <Route path="/mcp-protocol" component={MCPProtocol} />
            <Route path="/credentials-management" component={CredentialsManagement} />
            <Route path="/demo-workflow" component={DemoWorkflow} />
            <Route path="/deployment-management" component={DeploymentManagement} />
            <Route path="/user-management" component={UserManagement} />
            <Route path="/organization-management" component={OrganizationManagement} />
            <Route path="/billing-management" component={BillingManagement} />
            <Route path="/agent-builder" component={AgentBuilder} />
            <Route path="/chat" component={ChatConsole} />
            <Route path="/monitoring" component={Monitoring} />
            <Route path="/custom-models" component={CustomModels} />
            <Route path="/modules" component={ModuleLibrary} />
            <Route path="/api-management" component={APIManagement} />
            <Route path="/agent-communication" component={AgentCommunication} />
            <Route path="/enhanced-agent-app-builder" component={EnhancedAgentAppBuilder} />
            <Route path="/visual-agent-app-builder" component={VisualAgentAppBuilder} />
            <Route path="/agent-app-catalog" component={AgentAppCatalog} />
            <Route path="/agent-realtime-monitor" component={AgentRealtimeMonitor} />
            <Route path="/hotel-demo" component={HotelDemo} />
            <Route path="/connection-testing" component={ConnectionTesting} />
            <Route path="/admin/credit-management" component={AdminCreditManagement} />
            <Route path="/email-templates" component={EmailTemplates} />
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
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <ProtectedRouter />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
