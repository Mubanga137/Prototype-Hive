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
    // Try to reach the API
    const apiUrl = "https://cnaajzmbkisybwnjeiie.supabase.co/rest/v1/";
    const response = await fetch(apiUrl, {
      method: "HEAD",
      headers: {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYWFqem1ia2lzeWJ3bmplaWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjY0NTIsImV4cCI6MjA5MDA0MjQ1Mn0.4YL8sotyk8noKqUMMcciWSwcIRG4_oy-J4a-B1KJA2o",
      },
      mode: "no-cors",
    });
    
    status.canReachAPI = response.status < 500 || response.status === 0; // 0 = no-cors mode
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
