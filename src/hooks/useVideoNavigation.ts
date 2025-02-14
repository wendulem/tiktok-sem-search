import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { ComponentProps, Slot } from '@/types';

/**
 * useVideoNavigation Hook
 * 
 * Manages video slot navigation and interaction tracking:
 * - Handles next/previous video transitions
 * - Tracks user navigation events
 * - Maintains slot state across the interface
 * 
 * @param pageSessionId - Current session identifier
 * @param initialSlots - Initial configuration of video slots
 * @param videoCount - Total number of available videos
 */
export function useVideoNavigation({ pageSessionId, initialSlots = [], videoCount = 0 }: Pick<ComponentProps, 'pageSessionId' | 'initialSlots' | 'videoCount'>) {
  const supabase = useSupabaseClient();
  const [slots, setSlots] = useState<Slot[]>(initialSlots);

  /**
   * Advances to next video in specified slot and logs interaction
   * @param slotIndex - Target slot position
   */
  async function handleNext(slotIndex: number) {
    const currentVideoId = slots[slotIndex].videoIndex;

    // Track navigation event
    if (pageSessionId) {
      await supabase.from("video_interactions").insert([
        {
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "NEXT",
        },
      ]);
    }

    // Update slot state with circular navigation
    setSlots((prevSlots) =>
      prevSlots.map((slot, index) =>
        index === slotIndex
          ? { ...slot, videoIndex: (slot.videoIndex + 1) % videoCount } // Adjust for video length
          : slot
      )
    );
  }

  /**
   * Returns to previous video in specified slot and logs interaction
   * @param slotIndex - Target slot position
   */
  async function handlePrevious(slotIndex: number) {
    const currentVideoId = slots[slotIndex].videoIndex;

    // Track navigation event
    if (pageSessionId) {
      await supabase.from("video_interactions").insert([
        {
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "PREV",
        },
      ]);
    }

    // Update slot state with circular navigation
    setSlots((prevSlots) =>
      prevSlots.map((slot, index) =>
        index === slotIndex
          ? { ...slot, videoIndex: (slot.videoIndex - 1 + videoCount) % videoCount } // Adjust for video length
          : slot
      )
    );
  }

  return {
    slots,
    setSlots, // Expose setSlots so the component can modify slots as needed
    handleNext,
    handlePrevious,
  };
}