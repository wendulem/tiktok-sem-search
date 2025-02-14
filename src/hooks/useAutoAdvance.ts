import { useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

interface AutoAdvanceResult {
  autoAdvance: boolean;
  autoAdvanceSeconds: number;
  toggleAutoAdvanceCheckbox: (checked: boolean, currentVideoId: string) => Promise<void>;
  handleIntervalChange: (value: number) => void;
  handleAutoAdvanceNext: (slotIndex: number, slots: Slot[], setSlots: React.Dispatch<React.SetStateAction<Slot[]>>, totalVideos: number) => void;
}

interface Slot {
  isActive: boolean;
  videoIndex: number;
}

export function useAutoAdvance(
  pageSessionId: string | null,
  supabase: SupabaseClient
): AutoAdvanceResult {
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(5);
  const [autoAdvanceStartTime, setAutoAdvanceStartTime] = useState(0);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  async function toggleAutoAdvanceCheckbox(checked: boolean, currentVideoId: string) {
    if (checked) {
      setAutoAdvanceStartTime(Date.now());
      if (pageSessionId) {
        await supabase.from("video_interactions").insert([{
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "AUTO_ADVANCE_START"
        }]);
      }
    } else {
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

  function handleIntervalChange(value: number) {
    setAutoAdvanceSeconds(value);
    if (debounceTimer) clearTimeout(debounceTimer);

    const newTimer = setTimeout(async () => {
      if (!pageSessionId) return;
      await supabase.from("auto_advance_intervals").insert([{
        session_id: pageSessionId,
        interval_set: value
      }]);
    }, 2000);

    setDebounceTimer(newTimer);
  }

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