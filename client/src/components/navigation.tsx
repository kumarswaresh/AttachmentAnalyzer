import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Agent Catalog", icon: "📋" },
    { href: "/mcp-catalog", label: "MCP Catalog", icon: "🗂️" },
    { href: "/agent-builder", label: "Agent Builder", icon: "🔧" },
    { href: "/chat", label: "Chat Console", icon: "💬" },
    { href: "/monitoring", label: "Monitoring", icon: "📊" },
    { href: "/custom-models", label: "Custom Models", icon: "🧠" },
    { href: "/modules", label: "Module Library", icon: "🔌" },
    { href: "/api-management", label: "API Management", icon: "🔑" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🤖</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Agent Platform</span>
            </Link>
            
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors",
                      location === item.href
                        ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <span className="text-lg">🔔</span>
            </Button>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">AU</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
