// src/types/hooks.ts
import { Slot } from './core';
import { Dispatch, SetStateAction } from 'react';

export interface SessionTrackingResult {
  pageSessionId: string | null;
}

export interface UseFullscreenModeReturn {
  isFullscreen: boolean;
  handleFullScreen: () => Promise<void>;
}

export interface AutoAdvanceResult {
  autoAdvance: boolean;
  autoAdvanceSeconds: number;
  toggleAutoAdvanceCheckbox: (checked: boolean, currentVideoId: string) => Promise<void>;
  handleIntervalChange: (value: number) => void;
  handleAutoAdvanceNext: (
    slotIndex: number, 
    slots: Slot[], 
    setSlots: Dispatch<SetStateAction<Slot[]>>, 
    totalVideos: number
  ) => void;
}