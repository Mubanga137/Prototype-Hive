import { supabase, forceSignOut } from "@/integrations/supabase/client";

/**
 * Wraps Supabase queries to handle refresh token errors gracefully.
 * If a refresh token error occurs, it will:
 * 1. Clear the session
 * 2. Show the user a friendly message
 * 3. Redirect to login
 */
export const withTokenErrorHandling = async <T>(
  queryFn: () => Promise<T>,
  options?: {
    showErrorToast?: boolean;
    redirectUrl?: string;
  }
): Promise<T | null> => {
  try {
    return await queryFn();
  } catch (error: any) {
    // Check if this is a refresh token error
    if (
      error?.message?.includes("Refresh Token") ||
      error?.message?.includes("Invalid token") ||
      error?.message?.includes("Not found") ||
      error?.status === 401
    ) {
      console.error("[API] Refresh token error detected:", error.message);

      // Force sign out and clear tokens
      await forceSignOut();

      // Optional: Show toast notification
      if (options?.showErrorToast) {
        // Dynamic import to avoid circular dependencies
        import("sonner").then(({ toast }) => {
          toast.error("Your session has expired. Please log in again.");
        });
      }

      // Redirect to login
      const redirectUrl = options?.redirectUrl || "/login?reason=session_expired";
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = redirectUrl;
      }

      return null;
    }

    // Re-throw other errors
    throw error;
  }
};

/**
 * Safely fetch a single row from Supabase.
 * Handles refresh token errors automatically.
 */
export const safeGetSingle = async <T>(
  table: string,
  filter: { column: string; value: any },
  columns: string = "*"
): Promise<T | null> => {
  return withTokenErrorHandling(
    async () => {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .eq(filter.column, filter.value)
        .single();

      if (error) throw error;
      return data as T;
    },
    { showErrorToast: true }
  );
};

/**
 * Safely fetch multiple rows from Supabase.
 * Handles refresh token errors automatically.
 */
export const safeGetMany = async <T>(
  table: string,
  filter?: { column: string; value: any },
  columns: string = "*"
): Promise<T[]> => {
  const result = await withTokenErrorHandling(
    async () => {
      let query = supabase.from(table).select(columns);

      if (filter) {
        query = query.eq(filter.column, filter.value);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as T[];
    },
    { showErrorToast: true }
  );

  return result || [];
};

/**
 * Safely update a row in Supabase.
 * Handles refresh token errors automatically.
 */
export const safeUpdate = async <T>(
  table: string,
  updates: Record<string, any>,
  filter: { column: string; value: any }
): Promise<T | null> => {
  return withTokenErrorHandling(
    async () => {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq(filter.column, filter.value)
        .select()
        .single();

      if (error) throw error;
      return data as T;
    },
    { showErrorToast: true }
  );
};
