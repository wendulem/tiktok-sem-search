import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { SessionTrackingResult } from '@/types';

/**
 * useSessionTracking Hook
 * 
 * Manages user session lifecycle in the application:
 * - Creates unique session IDs
 * - Tracks session start/end times
 * - Handles visibility and page unload events
 * 
 * @param supabase - Supabase client for database operations
 * @param userId - Current user's unique identifier
 * @returns SessionTrackingResult containing session ID
 */
export function useSessionTracking(
  supabase: SupabaseClient,
  userId: string | undefined
): SessionTrackingResult {
  // Track the current page session ID
  const [pageSessionId, setPageSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Generate new session ID
    const newSessionId = uuidv4();
    setPageSessionId(newSessionId);

    /**
     * Initializes a new session in the database
     */
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

    /**
     * Updates session end time in the database
     */
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

    // Initialize session
    startSession();

    // Set up event listeners for session end conditions
    window.addEventListener("beforeunload", endSession);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) endSession();
    });

    // Cleanup event listeners and end session
    return () => {
      window.removeEventListener("beforeunload", endSession);
      document.removeEventListener("visibilitychange", endSession);
      endSession();
    };
  }, [userId, supabase]);

  return { pageSessionId };
}