import { supabase } from "@/integrations/supabase/client";

interface SystemStatus {
  supabaseConnection: {
    status: "healthy" | "unhealthy";
    url: string;
    error?: string;
  };
  messagingTables: {
    conversations: { exists: boolean; rowCount?: number; error?: string };
    messages: { exists: boolean; rowCount?: number; error?: string };
    orders: { exists: boolean; rowCount?: number; error?: string };
  };
  realtimeEnabled: {
    conversations: boolean;
    messages: boolean;
  };
  environmentVariables: {
    supabaseUrl: boolean;
    supabaseKey: boolean;
    webhookUrl: boolean;
  };
  auth: {
    currentUser: string;
    isAuthenticated: boolean;
  };
}

export const checkSystemStatus = async (): Promise<SystemStatus> => {
  console.log("[SystemStatus] Starting comprehensive system check...");

  const status: SystemStatus = {
    supabaseConnection: {
      status: "healthy",
      url: import.meta.env.VITE_SUPABASE_URL || "NOT SET",
    },
    messagingTables: {
      conversations: { exists: false },
      messages: { exists: false },
      orders: { exists: false },
    },
    realtimeEnabled: {
      conversations: false,
      messages: false,
    },
    environmentVariables: {
      supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      webhookUrl: !!import.meta.env.VITE_ORDER_WEBHOOK_URL,
    },
    auth: {
      currentUser: "unknown",
      isAuthenticated: false,
    },
  };

  // Test Supabase connection
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    status.auth.isAuthenticated = !!session;
    status.auth.currentUser = session?.user?.id || "guest";
    console.log("[SystemStatus] Auth:", {
      authenticated: !!session,
      userId: session?.user?.id || "guest",
    });
  } catch (err) {
    status.supabaseConnection.status = "unhealthy";
    status.supabaseConnection.error = String(err);
    console.error("[SystemStatus] Failed to get auth session:", err);
  }

  // Check conversations table
  try {
    const { count, error } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    status.messagingTables.conversations = {
      exists: true,
      rowCount: count || 0,
    };
    console.log(
      "[SystemStatus] Conversations table:",
      `${count} rows found`
    );
  } catch (err) {
    status.messagingTables.conversations = {
      exists: false,
      error: String(err),
    };
    console.error("[SystemStatus] Conversations table error:", err);
  }

  // Check messages table
  try {
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    status.messagingTables.messages = {
      exists: true,
      rowCount: count || 0,
    };
    console.log("[SystemStatus] Messages table:", `${count} rows found`);
  } catch (err) {
    status.messagingTables.messages = {
      exists: false,
      error: String(err),
    };
    console.error("[SystemStatus] Messages table error:", err);
  }

  // Check orders table
  try {
    const { count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    status.messagingTables.orders = {
      exists: true,
      rowCount: count || 0,
    };
    console.log("[SystemStatus] Orders table:", `${count} rows found`);
  } catch (err) {
    status.messagingTables.orders = {
      exists: false,
      error: String(err),
    };
    console.error("[SystemStatus] Orders table error:", err);
  }

  // Check realtime subscriptions (by attempting subscription)
  try {
    const channel = supabase.channel("system-status-check");
    const conversationsReady = await new Promise((resolve) => {
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversations",
          },
          () => {}
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => {}
        )
        .subscribe((status) => {
          resolve(status === "SUBSCRIBED");
        });

      setTimeout(() => resolve(false), 2000);
    });

    if (conversationsReady) {
      status.realtimeEnabled.conversations = true;
      status.realtimeEnabled.messages = true;
    }

    supabase.removeChannel(channel);
    console.log("[SystemStatus] Realtime enabled:", conversationsReady);
  } catch (err) {
    console.warn("[SystemStatus] Realtime check failed:", err);
  }

  return status;
};

export const printSystemStatus = async () => {
  const status = await checkSystemStatus();

  console.group(
    "%c🐝 HIVE SYSTEM STATUS",
    "color: #FFB800; font-size: 16px; font-weight: bold"
  );

  console.group("✅ Supabase Connection");
  console.log(`Status: ${status.supabaseConnection.status}`);
  console.log(`URL: ${status.supabaseConnection.url}`);
  if (status.supabaseConnection.error) {
    console.error(`Error: ${status.supabaseConnection.error}`);
  }
  console.groupEnd();

  console.group("📊 Messaging Tables");
  console.log(
    `Conversations: ${status.messagingTables.conversations.exists ? "✅ EXISTS" : "❌ MISSING"} (${status.messagingTables.conversations.rowCount || 0} rows)`
  );
  if (status.messagingTables.conversations.error) {
    console.error(`Error: ${status.messagingTables.conversations.error}`);
  }
  console.log(
    `Messages: ${status.messagingTables.messages.exists ? "✅ EXISTS" : "❌ MISSING"} (${status.messagingTables.messages.rowCount || 0} rows)`
  );
  if (status.messagingTables.messages.error) {
    console.error(`Error: ${status.messagingTables.messages.error}`);
  }
  console.log(
    `Orders: ${status.messagingTables.orders.exists ? "✅ EXISTS" : "❌ MISSING"} (${status.messagingTables.orders.rowCount || 0} rows)`
  );
  if (status.messagingTables.orders.error) {
    console.error(`Error: ${status.messagingTables.orders.error}`);
  }
  console.groupEnd();

  console.group("🔄 Realtime Subscriptions");
  console.log(
    `Conversations: ${status.realtimeEnabled.conversations ? "✅ ENABLED" : "❌ DISABLED"}`
  );
  console.log(`Messages: ${status.realtimeEnabled.messages ? "✅ ENABLED" : "❌ DISABLED"}`);
  console.groupEnd();

  console.group("🔐 Environment Variables");
  console.log(`VITE_SUPABASE_URL: ${status.environmentVariables.supabaseUrl ? "✅" : "❌"}`);
  console.log(`VITE_SUPABASE_ANON_KEY: ${status.environmentVariables.supabaseKey ? "✅" : "❌"}`);
  console.log(`VITE_ORDER_WEBHOOK_URL: ${status.environmentVariables.webhookUrl ? "✅" : "⚠️ Optional"}`);
  console.groupEnd();

  console.group("👤 Authentication");
  console.log(`User: ${status.auth.currentUser}`);
  console.log(`Authenticated: ${status.auth.isAuthenticated ? "✅ YES" : "⚠️ GUEST"}`);
  console.groupEnd();

  console.log(
    "%cℹ️ Full status object available as: systemStatus (copy and paste into chat)",
    "color: #0066CC; font-size: 12px"
  );

  console.groupEnd();

  // Make available as window variable
  (window as any).systemStatus = status;

  return status;
};

// Auto-run on app load in development
if (import.meta.env.DEV) {
  console.log(
    "%c🐝 Hive System Status Check: Run printSystemStatus() in console",
    "color: #FFB800; font-weight: bold"
  );
  (window as any).printSystemStatus = printSystemStatus;
}
