import { supabase } from "@/integrations/supabase/client";

/**
 * Test if we can query orders table by tracking_token
 * Use this in browser console: testGuestLedgerQuery("your-token-here")
 */
export async function testGuestLedgerQuery(trackingToken: string) {
  console.log("[TestGuestLedger] Starting query test with token:", trackingToken);

  try {
    // Test 1: Simple select with limit
    console.log("[TestGuestLedger] Test 1: Simple table read...");
    const { data: allOrders, error: limitError } = await supabase
      .from("orders")
      .select("id, tracking_token, status")
      .limit(1);

    if (limitError) {
      console.error("[TestGuestLedger] ❌ Cannot read orders table:", limitError);
      return { success: false, reason: "Cannot read orders table", error: limitError };
    }
    console.log("[TestGuestLedger] ✓ Can read orders table");

    // Test 2: Query with tracking_token filter
    console.log("[TestGuestLedger] Test 2: Query by tracking_token...");
    const { data, error, status, statusText } = await supabase
      .from("orders")
      .select(
        `id, tracking_token, customer_phone, customer_name, total_price,
         total_amount, otp_code, status, item_type, delivery_address,
         scheduled_date, created_at, item_id, sme_id`
      )
      .eq("tracking_token", trackingToken)
      .maybeSingle();

    if (error) {
      console.error("[TestGuestLedger] ❌ Query failed:", {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
        hint: error.hint,
      });
      return {
        success: false,
        reason: "Query by tracking_token failed",
        error: error,
        httpStatus: status,
        httpStatusText: statusText,
      };
    }

    if (!data) {
      console.warn("[TestGuestLedger] ⚠️ No order found with this token");
      return {
        success: false,
        reason: "No order found",
        token: trackingToken,
        result: null,
      };
    }

    console.log("[TestGuestLedger] ✅ Successfully fetched order:", {
      orderId: data.id,
      status: data.status,
      tracking_token: data.tracking_token,
    });

    return {
      success: true,
      order: data,
    };
  } catch (err) {
    console.error("[TestGuestLedger] ❌ Exception:", err);
    return {
      success: false,
      reason: "Exception during query",
      error: String(err),
    };
  }
}

/**
 * Check what tokens are in localStorage
 */
export function checkLocalStorageTokens() {
  const stored = localStorage.getItem("hive_guest_active_cart");
  const tokens = stored ? JSON.parse(stored) : [];

  console.log("[TestGuestLedger] localStorage tokens:", {
    key: "hive_guest_active_cart",
    count: tokens.length,
    tokens: tokens,
    allStorageKeys: Object.keys(localStorage).filter(k => k.includes("hive") || k.includes("supabase")),
  });

  return tokens;
}

/**
 * Helper: Run full diagnostic
 */
export async function runGuestLedgerDiagnostic() {
  console.log("=".repeat(60));
  console.log("GUEST LEDGER DIAGNOSTIC");
  console.log("=".repeat(60));

  const tokens = checkLocalStorageTokens();

  if (tokens.length === 0) {
    console.warn("❌ No tokens found in localStorage");
    return { success: false, reason: "No tokens in localStorage" };
  }

  const mostRecent = tokens[tokens.length - 1];
  console.log(`\nTesting most recent token: ${mostRecent}\n`);

  const result = await testGuestLedgerQuery(mostRecent);

  console.log("\n" + "=".repeat(60));
  console.log("DIAGNOSTIC RESULT:", result.success ? "✅ SUCCESS" : "❌ FAILED");
  console.log("=".repeat(60));

  return result;
}
