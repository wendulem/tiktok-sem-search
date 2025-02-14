import { useState, useEffect, RefObject } from 'react';
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { ComponentProps, UseFullscreenModeReturn } from '@/types';

/**
 * useFullscreenMode Hook
 * 
 * Manages fullscreen functionality for video compilation mode including:
 * - Toggle fullscreen state
 * - Handle browser compatibility
 * - Track analytics for compilation mode sessions
 * 
 * @param pageSessionId - Unique identifier for the current session
 * @param containerRef - Reference to container element for fullscreen
 * @returns UseFullscreenModeReturn object with state and handler
 */
export function useFullscreenMode({ 
  pageSessionId, 
  containerRef 
}: Pick<ComponentProps, 'pageSessionId' | 'containerRef'>): UseFullscreenModeReturn {
  const supabase = useSupabaseClient();
  // Track fullscreen state and compilation session
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [compilationModeSessionId, setCompilationModeSessionId] = useState<string | null>(null);

  // Set up fullscreen change event listener
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  /**
   * Handles entering/exiting fullscreen mode and tracks analytics
   * Supports multiple browser implementations for fullscreen API
   */
  const handleFullScreen = async () => {
    if (!containerRef?.current) return;

    if (!isFullscreen) {
      // Enter fullscreen (compilation mode) with browser compatibility
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        await (containerRef.current as any).webkitRequestFullscreen();
      }

      // Track compilation mode session start
      if (pageSessionId) {
        const { data, error } = await supabase
          .from("compilation_mode_sessions")
          .insert([{
            session_id: pageSessionId,
            entered_at: new Date().toISOString(),
          }])
          .select();

        // Save the ID for exiting
        if (data && data.length > 0) {
          setCompilationModeSessionId(data[0].id);
        }
      }
    } else {
      // Exit fullscreen and update session tracking
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }

      if (compilationModeSessionId) {
        await supabase
          .from("compilation_mode_sessions")
          .update({ exited_at: new Date().toISOString() })
          .eq("id", compilationModeSessionId);
        
        setCompilationModeSessionId(null);
      }
    }
    
    setIsFullscreen(!isFullscreen);
  };

  return {
    isFullscreen,
    handleFullScreen
  };
}