import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role?: string;
  globalRole?: string;
  organizationId?: number;
}

export function useAuth() {
  const sessionToken = localStorage.getItem("sessionToken");
  
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      if (!sessionToken) {
        throw new Error("No session token");
      }
      const response = await apiRequest("GET", "/api/auth/me");
      if (!response.ok) {
        localStorage.removeItem("sessionToken");
        throw new Error("Authentication failed");
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!sessionToken,
  });

  const userRole = user?.globalRole || user?.role || '';
  const isAdmin = userRole === 'admin' || user?.username === 'admin';

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user && !error && !!sessionToken,
    isAdmin,
    isSuperAdmin: isAdmin,
    error
  };
}