import { useState, useEffect, RefObject } from 'react';
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface UseFullscreenModeProps {
  pageSessionId: string | null;
  containerRef: RefObject<HTMLDivElement | null>;  // Make containerRef nullable
}

interface UseFullscreenModeReturn {
  isFullscreen: boolean;
  handleFullScreen: () => Promise<void>;
}

export function useFullscreenMode({ 
  pageSessionId, 
  containerRef 
}: UseFullscreenModeProps): UseFullscreenModeReturn {
  const supabase = useSupabaseClient();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [compilationModeSessionId, setCompilationModeSessionId] = useState<string | null>(null);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleFullScreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      // ENTER compilation mode
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        await (containerRef.current as any).webkitRequestFullscreen();
      }

      if (pageSessionId) {
        // Insert a row in compilation_mode_sessions
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
      // EXIT compilation mode
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