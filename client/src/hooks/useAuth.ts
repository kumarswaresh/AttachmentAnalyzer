import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("sessionToken");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await apiRequest("GET", "/api/auth/me");
      const userData = await response.json();
      
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      localStorage.removeItem("sessionToken");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        usernameOrEmail,
        password
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("sessionToken", data.sessionToken);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: "Login failed" };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        username,
        email,
        password
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("sessionToken", data.sessionToken);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("sessionToken");
      if (token) {
        await apiRequest("POST", "/api/auth/logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("sessionToken");
      setUser(null);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}