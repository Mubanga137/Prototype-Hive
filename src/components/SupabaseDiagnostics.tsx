import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Loader, Terminal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkSupabaseHealth } from "@/lib/supabaseHealthCheck";

export default function SupabaseDiagnostics() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log("[Diagnostics] Starting Supabase health check...");

      // Test 1: Client config
      const config = {
        url: "https://cnaajzmbkisybwnjeiie.supabase.co",
        keyPresent: true,
        hostname: window.location.hostname,
        builderPreview: window.location.hostname.includes("builder"),
      };

      // Test 2: Simple select query
      let selectTest = { success: false, message: "" };
      try {
        const { data, error } = await supabase.from("orders").select("*").limit(1);
        selectTest = {
          success: !error,
          message: error ? `Error: ${error.message}` : "Table query successful",
        };
      } catch (e) {
        selectTest = {
          success: false,
          message: `Exception: ${String(e)}`,
        };
      }

      // Test 3: Full health check
      const health = await checkSupabaseHealth();

      // Test 4: Try RPC (will likely fail, but we capture the error)
      let rpcTest = { success: false, message: "", error: {} };
      try {
        const { data, error } = await supabase.rpc("secure_place_order", {
          p_buyer_id: null,
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
        });

        if (error) {
          rpcTest = {
            success: false,
            message: error.message,
            error: {
              code: error.code,
              details: error.details,
              hint: error.hint,
            },
          };
        } else {
          rpcTest = {
            success: true,
            message: "RPC call succeeded",
            error: {},
          };
        }
      } catch (e) {
        rpcTest = {
          success: false,
          message: `Exception: ${String(e)}`,
          error: {
            type: (e as Error)?.name,
            stack: (e as Error)?.message,
          },
        };
      }

      const finalResult = {
        timestamp: new Date().toISOString(),
        config,
        selectTest,
        health,
        rpcTest,
        summary: {
          clientReady: config.keyPresent,
          tableAccessible: selectTest.success,
          healthStatus: health.isHealthy,
          rpcAccessible: rpcTest.success,
          overallStatus:
            selectTest.success && health.isHealthy
              ? "OPERATIONAL"
              : "DEGRADED",
        },
      };

      setResult(finalResult);
      console.log("[Diagnostics] Complete:", finalResult);
    } catch (error) {
      const errorResult = {
        timestamp: new Date().toISOString(),
        error: String(error),
        message: (error as Error).message,
      };
      setResult(errorResult);
      console.error("[Diagnostics] Failed:", errorResult);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Test Button */}
      <Button
        onClick={() => {
          if (!testing && !expanded) {
            runDiagnostics();
          }
          setExpanded(!expanded);
        }}
        disabled={testing}
        variant={result?.summary?.overallStatus === "OPERATIONAL" ? "default" : "destructive"}
        className="mb-2 w-full"
      >
        {testing ? (
          <Loader className="animate-spin mr-2 h-4 w-4" />
        ) : result?.summary?.overallStatus === "OPERATIONAL" ? (
          <CheckCircle className="mr-2 h-4 w-4" />
        ) : (
          <AlertTriangle className="mr-2 h-4 w-4" />
        )}
        {testing ? "Testing..." : "Supabase Status"}
      </Button>

      {/* Results Panel */}
      {expanded && result && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-xs font-mono max-h-96 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
            {result.summary?.overallStatus === "OPERATIONAL" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <span className="font-bold">
              Status: {result.summary?.overallStatus || "ERROR"}
            </span>
          </div>

          {/* Config Section */}
          <div className="mb-3 pb-2 border-b">
            <div className="font-bold text-blue-600 mb-1">Client Config</div>
            <div>Hostname: {result.config?.hostname}</div>
            <div>Builder Preview: {result.config?.builderPreview ? "YES ⚠️" : "NO"}</div>
          </div>

          {/* Table Query Test */}
          <div className="mb-3 pb-2 border-b">
            <div className={`font-bold mb-1 ${result.selectTest?.success ? "text-green-600" : "text-red-600"}`}>
              Table Query: {result.selectTest?.success ? "✓" : "✗"}
            </div>
            <div className="text-gray-700 break-words">{result.selectTest?.message}</div>
          </div>

          {/* Health Check */}
          <div className="mb-3 pb-2 border-b">
            <div className={`font-bold mb-1 ${result.health?.isHealthy ? "text-green-600" : "text-red-600"}`}>
              Health Check: {result.health?.isHealthy ? "✓ HEALTHY" : "✗ UNHEALTHY"}
            </div>
            <div>Auth: {result.health?.canAuth ? "✓" : "✗"}</div>
            <div>Token: {result.health?.hasValidToken ? "✓" : "✗"}</div>
            <div>API Reach: {result.health?.canReachAPI ? "✓" : "✗"}</div>
            {result.health?.error && (
              <div className="text-red-600 mt-1 break-words">{result.health.error}</div>
            )}
          </div>

          {/* RPC Test */}
          <div className="mb-2">
            <div className={`font-bold mb-1 ${result.rpcTest?.success ? "text-green-600" : "text-orange-600"}`}>
              RPC Test: {result.rpcTest?.success ? "✓" : "Blocked/Error"}
            </div>
            <div className="text-gray-700 break-words">{result.rpcTest?.message}</div>
            {result.rpcTest?.error?.code && (
              <div className="mt-1 text-red-600">Code: {result.rpcTest.error.code}</div>
            )}
            {result.rpcTest?.error?.details && (
              <div className="mt-1 text-red-600 break-words">Details: {result.rpcTest.error.details}</div>
            )}
          </div>

          <div className="text-gray-400 text-xs mt-3 pt-2 border-t">
            {result.timestamp}
          </div>
        </div>
      )}
    </div>
  );
}
