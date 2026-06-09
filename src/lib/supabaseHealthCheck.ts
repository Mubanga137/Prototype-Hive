import { supabase } from "@/integrations/supabase/client";

export interface SupabaseHealthStatus {
  isHealthy: boolean;
  canReachAPI: boolean;
  canAuth: boolean;
  hasValidToken: boolean;
  canQueryTable: boolean;
  canCallRPC: boolean;
  error?: string;
  details?: Record<string, any>;
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
    canQueryTable: false,
    canCallRPC: false,
    timestamp: new Date(),
    details: {},
  };

  try {
    // STEP 1: Test Auth
    const { data, error: authError } = await supabase.auth.getSession();
    status.canAuth = !authError;
    status.hasValidToken = !!data?.session?.access_token;

    if (authError) {
      status.details!.authError = authError;
    }

    // STEP 2: Test basic table query (simple select)
    try {
      const { data: tableData, error: queryError } = await supabase
        .from("orders")
        .select("*")
        .limit(1);

      status.canQueryTable = !queryError;
      status.canReachAPI = true;

      if (queryError) {
        status.details!.queryError = {
          message: queryError.message,
          code: queryError.code,
          details: queryError.details,
        };
      }
    } catch (tableErr) {
      status.details!.tableQueryException = String(tableErr);
      status.canReachAPI = false;
    }

    // STEP 3: Test RPC call (simple test)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "secure_place_order",
        {
          p_customer_actor_id: null,
          p_item_id: 0,
          p_sme_id: null,
          p_store_id: null,
          p_quantity: 0,
          p_customer_name: "TEST",
          p_customer_phone: "0000000000",
          p_delivery_address: null,
          p_scheduled_date: null,
          p_service_notes: null,
          p_item_type: "product",
        },
        { head: false }
      );

      status.canCallRPC = !rpcError;

      if (rpcError) {
        status.details!.rpcError = {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint,
        };
      }
    } catch (rpcErr) {
      status.details!.rpcException = {
        message: String(rpcErr),
        type: (rpcErr as Error)?.name,
      };
    }
  } catch (err) {
    status.error = `Health check failed: ${(err as Error).message}`;
  }

  status.isHealthy = status.canAuth && status.hasValidToken && status.canReachAPI;

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
    canQueryTable: health.canQueryTable,
    canCallRPC: health.canCallRPC,
    error: health.error,
    details: health.details,
    timestamp: health.timestamp,
  });

  return health;
}
