import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Agent Catalog", icon: "📋" },
    { href: "/mcp-catalog", label: "MCP Catalog", icon: "🗂️" },
    { href: "/agent-builder", label: "Agent Builder", icon: "🔧" },
    { href: "/chat", label: "Chat Console", icon: "💬" },
    { href: "/agent-communication", label: "Agent Communication", icon: "🔗" },
    { href: "/enhanced-memory", label: "Enhanced Memory", icon: "🧠" },
    { href: "/response-schemas", label: "Response Schemas", icon: "🛡️" },
    { href: "/visual-app-builder", label: "Visual App Builder", icon: "⚡" },
    { href: "/monitoring", label: "Monitoring", icon: "📊" },
    { href: "/custom-models", label: "Custom Models", icon: "🤖" },
    { href: "/modules", label: "Module Library", icon: "🔌" },
    { href: "/api-management", label: "API Management", icon: "🔑" },
    { href: "/mcp-protocol", label: "MCP Protocol", icon: "🌐" },
    { href: "/hotel-demo", label: "Hotel Demo", icon: "🏨" },
  ];

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
                  {!isCollapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 p-4">
          {!isCollapsed ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">AU</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
                <p className="text-xs text-gray-500 truncate">admin@example.com</p>
              </div>
              <Button variant="ghost" size="sm">
                <span className="text-lg">🔔</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">AU</span>
              </div>
              <Button variant="ghost" size="sm">
                <span className="text-lg">🔔</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}