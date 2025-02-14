import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface Slot {
  isActive: boolean;
  videoIndex: number;
}

interface UseVideoNavigationProps {
  pageSessionId: string | null;
  initialSlots: Slot[];
  videoCount: number; // Added videoCount to handle dynamic length
}

export function useVideoNavigation({ pageSessionId, initialSlots, videoCount }: UseVideoNavigationProps) {
  const supabase = useSupabaseClient();
  const [slots, setSlots] = useState<Slot[]>(initialSlots);

  // Handle going to the next video for a specific slot
  async function handleNext(slotIndex: number) {
    const currentVideoId = slots[slotIndex].videoIndex;
    if (pageSessionId) {
      await supabase.from("video_interactions").insert([
        {
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "NEXT",
        },
      ]);
    }

    setSlots((prevSlots) =>
      prevSlots.map((slot, index) =>
        index === slotIndex
          ? { ...slot, videoIndex: (slot.videoIndex + 1) % videoCount } // Adjust for video length
          : slot
      )
    );
  }

  // Handle going to the previous video for a specific slot
  async function handlePrevious(slotIndex: number) {
    const currentVideoId = slots[slotIndex].videoIndex;
    if (pageSessionId) {
      await supabase.from("video_interactions").insert([
        {
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "PREV",
        },
      ]);
    }

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