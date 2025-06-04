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
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/auth/profile'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const userRole = user?.globalRole || user?.role || '';
  const isAdmin = userRole === 'admin' || user?.username === 'admin';

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user && !error,
    isAdmin,
    isSuperAdmin: isAdmin,
    error
  };
}