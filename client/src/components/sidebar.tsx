import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { toast } = useToast();

  // Check user role and permissions for feature access
  const { user, isAdmin, isSuperAdmin, logout } = useAuth();

  // Permission checker function
  const hasPermission = (permission: string) => {
    if (isSuperAdmin) return true;
    if (!user) return false;
    // For now, we'll use role-based permissions until we implement proper RBAC
    return isAdmin || isSuperAdmin;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      logout();
      toast({
        title: "Logged out",
        description: "You have been logged out.",
      });
    }
  };

  // Define navigation items with role-based filtering
  const navItems = [
    { href: "/", label: "Home", icon: "🏠", permission: null },
    
    // SuperAdmin only features
    ...(isSuperAdmin ? [
      { href: "/dashboard", label: "Admin Dashboard", icon: "📊", badge: "SuperAdmin", permission: "admin:*" },
      { href: "/user-management", label: "User Management", icon: "👥", permission: "users:*" },
      { href: "/organization-management", label: "Organizations", icon: "🏢", permission: "organizations:*" },
      { href: "/billing-management", label: "Billing & Credits", icon: "💳", permission: "billing:*" },
      { href: "/admin/credit-management", label: "Credit Management", icon: "🎫", permission: "billing:*" },
      { href: "/email-templates", label: "Email Marketing", icon: "📧", permission: "marketing:*" },
    ] : []),
    
    // Admin features (Organization admins and above)
    ...(isAdmin ? [
      { href: "/monitoring", label: "Monitoring", icon: "📊", permission: "analytics:read" },
      { href: "/api-management", label: "API Management", icon: "🔑", permission: "api:manage" },
    ] : []),
    
    // Agent management (Developers and above)
    ...(hasPermission('agents:read') ? [
      { href: "/agent-catalog", label: "Agent Catalog", icon: "📋", permission: "agents:read" },
      { href: "/agent-app-catalog", label: "Agent App Catalog", icon: "🚀", permission: "apps:read" },
    ] : []),
    
    ...(hasPermission('agents:create') ? [
      { href: "/agent-builder", label: "Workflow Agent App", icon: "🔧", permission: "agents:create" },
      { href: "/visual-agent-app-builder", label: "Visual Agent Builder", icon: "🎨", permission: "agents:create" },
    ] : []),
    
    // Credential management
    ...(hasPermission('credentials:read') ? [
      { href: "/credentials-management", label: "Credentials", icon: "🔐", permission: "credentials:read" },
    ] : []),
    
    // Deployment features
    ...(hasPermission('agents:deploy') || isAdmin ? [
      { href: "/deployment-management", label: "Deployments", icon: "🚀", permission: "agents:deploy" },
    ] : []),
    
    // Communication and execution features
    ...(hasPermission('agents:execute') ? [
      { href: "/chat", label: "Chat Console", icon: "💬", permission: "agents:execute" },
      { href: "/agent-communication", label: "Agent Communication", icon: "🔗", permission: "agents:execute" },
    ] : []),
    
    // Real-time monitoring
    ...(hasPermission('agents:monitor') || isAdmin ? [
      { href: "/agent-realtime-monitor", label: "Real-time Monitor", icon: "⚡", permission: "agents:monitor" },
    ] : []),
    
    // Advanced features
    ...(hasPermission('modules:manage') || isAdmin ? [
      { href: "/custom-models", label: "Custom Models", icon: "🧠", permission: "modules:manage" },
      { href: "/modules", label: "Module Library", icon: "🔌", permission: "modules:manage" },

      { href: "/mcp-protocol", label: "MCP Protocol", icon: "⚡", permission: "modules:manage" },
    ] : []),
    
    // Demo features (available to all authenticated users)
    { href: "/demo-workflow", label: "Demo Workflow", icon: "🎯", permission: null },
    { href: "/hotel-demo", label: "Hotel Demo", icon: "🏨", permission: null },
  ].filter(item => 
    item.permission === null || 
    hasPermission(item.permission) || 
    isSuperAdmin
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">🤖</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Agent Platform</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        "lg:relative lg:translate-x-0",
        isCollapsed ? "w-16" : "w-64",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!isCollapsed && (
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🤖</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Agent Platform</span>
            </Link>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold">🤖</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start px-3 py-2 text-sm font-medium transition-colors",
                    location === item.href
                      ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                    isCollapsed && "px-2 justify-center"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span className={cn("text-lg", !isCollapsed && "mr-3")}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 p-4">
          {!isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                  {(user?.role || user?.globalRole) && (
                    <p className="text-xs text-blue-600 truncate">
                      {user?.globalRole || user?.role}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                <span className="text-lg">🚪</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}