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
    // Simple check: try to query a table (this will verify auth AND API)
    const { error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    // If we can query without a "connection" error, API is reachable
    // Note: RLS errors are OK — it means API is working
    status.canReachAPI = !error || error.code !== "ECONNREFUSED";
  } catch (err) {
    status.error = `API unreachable: ${(err as Error).message}`;
  }

  try {
    // Check if we can get session
    const { data, error } = await supabase.auth.getSession();
    status.canAuth = !error;
    status.hasValidToken = !!data?.session?.access_token;
  } catch (err) {
    status.error = `Auth check failed: ${(err as Error).message}`;
  }

  status.isHealthy = status.canReachAPI && status.canAuth;

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
