import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API Configuration
const API_VERSION = 'v1';
const API_BASE = `/api/${API_VERSION}`;

// Helper to get versioned API URL
export function getApiUrl(endpoint: string): string {
  // If endpoint already includes version, return as-is
  if (endpoint.includes('/api/v')) {
    return endpoint;
  }
  
  // If endpoint starts with /api/, replace with versioned API
  if (endpoint.startsWith('/api/')) {
    return endpoint.replace('/api/', `${API_BASE}/`);
  }
  
  // If endpoint starts with /, remove it before adding API_BASE
  if (endpoint.startsWith('/')) {
    return `${API_BASE}${endpoint}`;
  }
  
  // If endpoint doesn't start with /, add it
  return `${API_BASE}/${endpoint}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add authentication header if token exists
  const token = localStorage.getItem("sessionToken");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Auto-version the URL
  const versionedUrl = getApiUrl(url);

  const res = await fetch(versionedUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add authentication header if token exists
    const token = localStorage.getItem("sessionToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
