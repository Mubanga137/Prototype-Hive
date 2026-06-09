import { forceSignOut } from "@/integrations/supabase/client";

/**
 * Setup global error handlers for refresh token and auth errors.
 * Call this once in your app initialization (e.g., in App.tsx or main.tsx).
 */
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", async (event) => {
    const error = event.reason;

    // Check if it's a refresh token error
    if (
      error?.message?.includes("Refresh Token") ||
      error?.message?.includes("Invalid token") ||
      error?.message?.includes("Not found") ||
      (error?.status === 401 && error?.message?.includes("token"))
    ) {
      console.error("[Global Error Handler] Refresh token error detected:", error.message);

      // Prevent the default error handling
      event.preventDefault();

      // Clear session
      await forceSignOut();

      import("sonner").then(({ toast }) => {
        toast.error("⚠️ Account not found. Welcome to The Hive—please sign up!");
      });

      // Redirect to login if not already there
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?reason=token_expired";
      }
    }
  });

  // Handle global fetch errors (for API calls)
  const originalFetch = window.fetch;
  window.fetch = async (...args: any[]) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';

    try {
      const response = await originalFetch(...args);

      // Check for 401 Unauthorized
      if (response.status === 401) {
        const contentType = response.headers.get("content-type");
        let isTokenError = false;

        if (contentType?.includes("application/json")) {
          try {
            const data = await response.clone().json();
            isTokenError =
              data?.message?.includes("token") ||
              data?.message?.includes("Refresh Token") ||
              data?.error?.includes("token");
          } catch {
            isTokenError = true; // Assume it's a token error if we can't parse
          }
        } else {
          isTokenError = true; // Any 401 could be a token error
        }

        if (isTokenError) {
          console.warn("[Global Error Handler] 401 Token error detected in fetch", { url });
          await forceSignOut();

          import("sonner").then(({ toast }) => {
            toast.error("⚠️ Account not found. Welcome to The Hive—please sign up!");
          });

          if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
            window.location.href = "/login?reason=unauthorized";
          }
        }
      }

      return response;
    } catch (error: any) {
      // Silent "Failed to fetch" errors - common in preview mode retries
      if (error?.message?.includes("Failed to fetch")) {
        console.warn("[Global Error Handler] Network retry:", error?.message);
        throw error;
      }

      // Log other detailed network error information
      if (error?.message?.includes("fetch")) {
        console.warn("[Global Error Handler] Network error detected", {
          url,
          error: error?.message,
          type: error?.name,
        });
      }

      if (
        error?.message?.includes("Refresh Token") ||
        error?.message?.includes("Invalid token")
      ) {
        console.error("[Global Error Handler] Fetch error with token issue:", error.message);
        await forceSignOut();

        import("sonner").then(({ toast }) => {
          toast.error("⚠️ Account not found. Welcome to The Hive—please sign up!");
        });

        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login?reason=fetch_error";
        }
      }

      throw error;
    }
  };
};

/**
 * Intercept Supabase RLS policy violations and permission errors.
 * This helps distinguish between actual auth failures and permission errors.
 */
export const isPermissionError = (error: any): boolean => {
  if (!error) return false;

  const message = error?.message || "";
  const code = error?.code || "";

  return (
    code === "PGRST301" || // RLS violation
    message.includes("permission") ||
    message.includes("Policy") ||
    message.includes("rows") ||
    code.includes("401") // Unauthorized
  );
};

/**
 * Intercept true authentication/token errors.
 */
export const isAuthError = (error: any): boolean => {
  if (!error) return false;

  const message = error?.message || "";

  return (
    message.includes("Refresh Token") ||
    message.includes("Invalid token") ||
    message.includes("INVALID_CREDENTIALS") ||
    message.includes("Not found") ||
    error?.status === 401
  );
};
