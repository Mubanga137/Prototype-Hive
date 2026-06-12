import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the count of conversations with unread messages.
 * For now, counts conversations where last_message_at > user's last read.
 * Simplified: counts total conversations as placeholder until read_at tracking is added.
 */
export const useUnreadCount = () => {
  const { profile } = useAuth();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!profile?.id) return;

    // Resolve actor ID from profile.id
    const { data: actor, error: actorError } = await (supabase as any)
      .from("actors")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (actorError || !actor?.id) {
      console.error("[useUnreadCount] Failed to resolve actor ID:", actorError);
      return;
    }

    const { count: total } = await (supabase as any)
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .or(`participant_1.eq.${actor.id},participant_2.eq.${actor.id}`)
      .not("last_message", "is", null);
    setCount(total ?? 0);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time refresh
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel("unread-count")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, load]);

  return count;
};
