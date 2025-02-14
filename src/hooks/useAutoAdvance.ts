import { useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { AutoAdvanceResult, Slot } from '@/types';

/**
 * useAutoAdvance Hook
 * 
 * Manages auto-advance functionality for video playback including:
 * - Toggle auto-advance on/off
 * - Configure interval duration
 * - Track analytics for auto-advance usage
 * - Handle video transitions
 * 
 * @param pageSessionId - Unique identifier for the current session
 * @param supabase - Supabase client instance for tracking analytics
 * @returns AutoAdvanceResult object containing state and handler functions
 */
export function useAutoAdvance(
  pageSessionId: string | null,
  supabase: SupabaseClient
): AutoAdvanceResult {
  // State management for auto-advance functionality
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(5);
  const [autoAdvanceStartTime, setAutoAdvanceStartTime] = useState(0);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  /**
   * Handles toggling auto-advance and tracks analytics
   * 
   * @param checked - New auto-advance state
   * @param currentVideoId - ID of currently playing video
   */
  async function toggleAutoAdvanceCheckbox(checked: boolean, currentVideoId: string) {
    if (checked) {
      // Start auto-advance and log analytics
      setAutoAdvanceStartTime(Date.now());
      if (pageSessionId) {
        await supabase.from("video_interactions").insert([{
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "AUTO_ADVANCE_START"
        }]);
      }
    } else {
      // Stop auto-advance and log duration
      const elapsed = Math.floor((Date.now() - autoAdvanceStartTime) / 1000);
      if (pageSessionId) {
        await supabase.from("video_interactions").insert([{
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "AUTO_ADVANCE_STOP",
          auto_advance_duration: elapsed
        }]);
      }
    }
    setAutoAdvance(checked);
  }

  /**
   * Updates auto-advance interval with debounced analytics tracking (so incremental changes aren't logged)
   * 
   * @param value - New interval duration in seconds
   */
  function handleIntervalChange(value: number) {
    setAutoAdvanceSeconds(value);

    // Clear existing debounce timer
    if (debounceTimer) clearTimeout(debounceTimer);

    // Set new debounced analytics tracking
    const newTimer = setTimeout(async () => {
      if (!pageSessionId) return;
      await supabase.from("auto_advance_intervals").insert([{
        session_id: pageSessionId,
        interval_set: value
      }]);
    }, 2000);

    setDebounceTimer(newTimer);
  }

  /**
   * Advances video to next in sequence for a specific slot, without logging a NEXT or PREV event
   * 
   * @param slotIndex - Index of slot to advance
   * @param slots - Current state of all video slots
   * @param setSlots - State setter for video slots
   * @param totalVideos - Total number of videos returned from the search
   */
  function handleAutoAdvanceNext(slotIndex: number, slots: Slot[], setSlots: React.Dispatch<React.SetStateAction<Slot[]>>, totalVideos: number) {
    setSlots(prevSlots => prevSlots.map((slot, index) => {
      if (index === slotIndex) {
        return {
          ...slot,
          videoIndex: (slot.videoIndex + 1) % totalVideos
        };
      }
      return slot;
    }));
  }

  return {
    autoAdvance,
    autoAdvanceSeconds,
    toggleAutoAdvanceCheckbox,
    handleIntervalChange,
    handleAutoAdvanceNext
  };
}