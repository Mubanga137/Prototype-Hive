import { supabase } from "@/integrations/supabase/client";

export interface SupabaseHealthStatus {
  isHealthy: boolean;
  canReachAPI: boolean;
  canAuth: boolean;
  hasValidToken: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Check if Supabase is reachable and functional
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const status: SupabaseHealthStatus = {
    isHealthy: false,
    canReachAPI: false,
    canAuth: false,
    hasValidToken: false,
    timestamp: new Date(),
  };

  try {
    // Check if we can get session
    const { data, error } = await supabase.auth.getSession();
    status.canAuth = !error;
    status.hasValidToken = !!data?.session?.access_token;
    status.canReachAPI = true; // If auth works, API is reachable
  } catch (err) {
    status.error = `Auth check failed: ${(err as Error).message}`;
    status.canReachAPI = false;
  }

  status.isHealthy = status.canAuth && status.hasValidToken;

  return status;
}

/**
 * Log Supabase health info to console
 */
export async function logSupabaseHealth(): Promise<void> {
  const health = await checkSupabaseHealth();
  
  console.log("[Supabase Health Check]", {
    isHealthy: health.isHealthy,
    canReachAPI: health.canReachAPI,
    canAuth: health.canAuth,
    hasValidToken: health.hasValidToken,
    error: health.error,
    timestamp: health.timestamp,
  });
}
