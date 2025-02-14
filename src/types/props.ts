// src/types/props.ts
import { RefObject } from 'react';
import { Slot, Video } from './core';

export interface ComponentProps {
    pageSessionId: string | null;
    containerRef?: RefObject<HTMLDivElement>;
    initialSlots?: Slot[];
    videoCount?: number;
  }
  
  export interface VideoControlsProps {
    slots: Slot[];
    handleAddLeft: () => void;
    handleAddRight: () => void;
    handleFullScreen: () => void;
  }
  
  export interface VideoSlotProps {
    isActive: boolean;
    video?: Video;
    videoIndex: number;
    totalVideos: number;
    slotIndex: number;
    isFullscreen: boolean;
    isBookmarked: boolean;
    onNext: () => void;
    onPrevious: () => void;
    onRemove: () => void;
    onBookmark: (videoId: string) => void;
  }