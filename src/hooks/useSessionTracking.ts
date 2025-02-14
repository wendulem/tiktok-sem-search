import { useState, useEffect } from './react';
import { SupabaseClient } from './@supabase/supabase-js';
import { v4 as uuidv4 } from './uuid';

interface SessionTrackingResult {
  pageSessionId: string | null;
}

export function useSessionTracking(
  supabase: SupabaseClient,
  userId: string | undefined
): SessionTrackingResult {
  const [pageSessionId, setPageSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const newSessionId = uuidv4();
    setPageSessionId(newSessionId);

    const startSession = async () => {
      try {
        await supabase.from("page_sessions").insert([
          {
            id: newSessionId,
            user_id: userId,
          },
        ]);
      } catch (error) {
        console.error("Failed to start session:", error);
      }
    };

    const endSession = async () => {
      if (!newSessionId) return;
      try {
        await supabase
          .from("page_sessions")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", newSessionId);
      } catch (error) {
        console.error("Failed to end session:", error);
      }
    };

    startSession();

    window.addEventListener("beforeunload", endSession);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) endSession();
    });

    return () => {
      window.removeEventListener("beforeunload", endSession);
      document.removeEventListener("visibilitychange", endSession);
      endSession();
    };
  }, [userId, supabase]);

  return { pageSessionId };
}