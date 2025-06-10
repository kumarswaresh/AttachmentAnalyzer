import { useQuery } from "@tanstack/react-query";

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
  
  const { data: user, isLoading, error } = useQuery<UserProfile | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      if (!sessionToken) {
        return null;
      }
      
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("sessionToken");
            return null;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem("sessionToken");
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!sessionToken,
  });

  const userRole = user?.globalRole || user?.role || '';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || user?.username === 'admin';

  const logout = () => {
    localStorage.removeItem("sessionToken");
    window.location.href = "/login";
  };

  return {
    user: user || null,
    isLoading: isLoading && !!sessionToken,
    isAuthenticated: !!user && !!sessionToken,
    isAdmin,
    isSuperAdmin: isAdmin,
    error,
    logout
  };
}