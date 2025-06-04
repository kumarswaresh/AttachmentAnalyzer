import { useQuery } from "@tanstack/react-query";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  organizationId?: number;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/auth/profile'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user && !error,
    isAdmin: user?.role === 'superadmin' || user?.role === 'admin',
    isSuperAdmin: user?.role === 'superadmin',
    error
  };
}