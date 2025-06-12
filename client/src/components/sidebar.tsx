import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { toast } = useToast();

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    userManagement: true,
    agentTools: true,
    integrations: true,
    advanced: true,
    demos: true,
  });

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
      await apiRequest("POST", "/api/auth/logout");
      logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      logout();
      toast({
        title: "Logged out",
        description: "You have been logged out.",
      });
    }
  };

  // Define navigation sections with role-based filtering
  const navigationSections = [
    {
      id: "main",
      title: null,
      items: [{ href: "/", label: "Home", icon: "🏠", permission: null }],
    },

    // User & Organization Management (SuperAdmin only)
    ...(isSuperAdmin
      ? [
          {
            id: "userManagement",
            title: "User & Organizations",
            icon: "👥",
            items: [
              {
                href: "/user-management",
                label: "User Management",
                icon: "👥",
                permission: "users:*",
              },
              {
                href: "/organization-management",
                label: "Organizations",
                icon: "🏢",
                permission: "organizations:*",
              },
              // { href: "/billing-management", label: "Billing & Credits", icon: "💳", permission: "billing:*" }, // Hidden
              // { href: "/admin/credit-management", label: "Credit Management", icon: "🎫", permission: "billing:*" }, // Hidden
            ],
          },
        ]
      : []),

    // Agent Tools & Development
    {
      id: "agentTools",
      title: "Agent Tools",
      icon: "🤖",
      items: [
        ...(hasPermission("agents:read")
          ? [
              {
                href: "/agent-catalog",
                label: "Agent Catalog",
                icon: "📋",
                permission: "agents:read",
              },
              {
                href: "/agent-app-catalog",
                label: "Agent App Catalog",
                icon: "🚀",
                permission: "apps:read",
              },
            ]
          : []),
        ...(hasPermission("agents:create")
          ? [
              {
                href: "/agent-builder",
                label: "Agent Builder",
                icon: "🔧",
                permission: "agents:create",
              },
              {
                href: "/visual-agent-app-builder",
                label: "Workflow",
                icon: "🎨",
                permission: "agents:create",
              },
            ]
          : []),
        ...(hasPermission("agents:execute")
          ? [
              { href: "/chat", label: "Chat Console", icon: "💬", permission: "agents:execute" },
              // { href: "/agent-communication", label: "Agent Communication", icon: "🔗", permission: "agents:execute" }, // Hidden
            ]
          : []),
        // ...(hasPermission('agents:deploy') || isAdmin ? [
        //   { href: "/deployment-management", label: "Deployments", icon: "🚀", permission: "agents:deploy" },
        // ] : []), // Hidden
        ...(hasPermission("agents:monitor") && !isAdmin
          ? [
              {
                href: "/agent-realtime-monitor",
                label: "Real-time Monitor",
                icon: "⚡",
                permission: "agents:monitor",
              },
            ]
          : []),
      ],
    },

    // Integrations & Management
    {
      id: "integrations",
      title: "Integrations",
      icon: "🔗",
      items: [
        ...(hasPermission("credentials:read")
          ? [
              {
                href: "/credentials-management",
                label: "Credentials",
                icon: "🔐",
                permission: "credentials:read",
              },
            ]
          : []),
        ...(isAdmin
          ? [
              {
                href: "/api-management",
                label: "API Management",
                icon: "🔑",
                permission: "api:manage",
              },
            ]
          : []),
        ...(hasPermission("integrations:test") || isAdmin
          ? [
              {
                href: "/connection-testing",
                label: "Connection Testing",
                icon: "🔌",
                permission: "integrations:test",
              },
              {
                href: "/mcp-protocol",
                label: "MCP Protocol",
                icon: "🔗",
                permission: "integrations:manage",
              },
            ]
          : []),
        ...(hasPermission("modules:manage") || isAdmin
          ? [
              {
                href: "/custom-models",
                label: "Custom Models",
                icon: "🧠",
                permission: "modules:manage",
              },
              {
                href: "/modules",
                label: "Module Library",
                icon: "🔌",
                permission: "modules:manage",
              },
            ]
          : []),
      ],
    },

    // Advanced Features (filtered out if empty)
    // {
    //   id: "advanced",
    //   title: "Advanced",
    //   icon: "⚙️",
    //   items: [
    //     // Hidden as requested: monitoring
    //   ]
    // },

    // Demo Features
    {
      id: "demos",
      title: "Demos",
      icon: "🎯",
      items: [
        // { href: "/demo-workflow", label: "Demo Workflow", icon: "🎯", permission: null }, // Hidden as requested
        { href: "/hotel-demo", label: "Hotel Demo", icon: "🏨", permission: null },
        { href: "/marketing-campaigns", label: "Marketing Campaigns", icon: "📊", permission: null },
        { href: "/marketing-demo", label: "OpenAI Campaign Generator", icon: "🤖", permission: null },
        { href: "/marketing-bedrock-demo", label: "AWS Bedrock Generator", icon: "☁️", permission: null },
      ],
    },

    // Hidden/Commented out items as requested:
    // { href: "/dashboard", label: "Admin Dashboard", icon: "📊", badge: "SuperAdmin", permission: "admin:*" }, // Hidden
    // { href: "/email-templates", label: "Email Marketing", icon: "📧", permission: "marketing:*" }, // Email marketing monitoring hidden
    // { href: "/demo-workflow", label: "Demo Workflow", icon: "🎯", permission: null }, // Demo workflow hidden
  ]
    .filter(section =>
      section.items.some(
        item => item.permission === null || hasPermission(item.permission) || isSuperAdmin
      )
    )
    .map(section => ({
      ...section,
      items: section.items.filter(
        item => item.permission === null || hasPermission(item.permission) || isSuperAdmin
      ),
    }));

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
        <Button variant="ghost" size="sm" onClick={() => setIsMobileOpen(!isMobileOpen)}>
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
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
          "lg:relative lg:translate-x-0",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
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
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-2 px-2">
            {navigationSections.map(section => (
              <div key={section.id}>
                {section.title ? (
                  <Collapsible
                    open={expandedSections[section.id as keyof typeof expandedSections]}
                    onOpenChange={() => toggleSection(section.id as keyof typeof expandedSections)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100",
                          isCollapsed && "px-2 justify-center"
                        )}
                      >
                        <span className={cn("text-lg", !isCollapsed && "mr-3")}>
                          {section.icon}
                        </span>
                        {!isCollapsed && (
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold">{section.title}</span>
                            {expandedSections[section.id as keyof typeof expandedSections] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1">
                      {section.items.map(item => (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start px-6 py-2 text-sm font-medium transition-colors",
                              location === item.href
                                ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                              isCollapsed && "px-2 justify-center"
                            )}
                            onClick={() => setIsMobileOpen(false)}
                          >
                            <span className={cn("text-base", !isCollapsed && "mr-3")}>
                              {item.icon}
                            </span>
                            {!isCollapsed && <span>{item.label}</span>}
                          </Button>
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  // Render items without collapsible wrapper for sections without titles (like "main")
                  section.items.map(item => (
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
                        <span className={cn("text-lg", !isCollapsed && "mr-3")}>{item.icon}</span>
                        {!isCollapsed && <span>{item.label}</span>}
                      </Button>
                    </Link>
                  ))
                )}
              </div>
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
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email || "user@example.com"}
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
                  {user?.username?.charAt(0).toUpperCase() || "U"}
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
