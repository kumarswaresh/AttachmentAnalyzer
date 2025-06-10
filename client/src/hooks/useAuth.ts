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
  
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!sessionToken,
  });

  const userRole = user?.globalRole || user?.role || '';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || user?.username === 'admin';

  return {
    user: user || null,
    isLoading: isLoading && !!sessionToken,
    isAuthenticated: !!user && !error && !!sessionToken,
    isAdmin,
    isSuperAdmin: isAdmin,
    error
  };
}