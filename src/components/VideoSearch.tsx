import React, { useState, useEffect, useRef, RefObject } from "react";
// import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { v4 as uuidv4 } from "uuid";
import { Slot, SearchResponse } from "@/types";

// Component imports
import { VideoSlot } from "@/components/VideoSlot";
import { VideoControls } from "@/components/VideoControls";

// Hook imports
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { useAutoAdvance } from "@/hooks/useAutoAdvance";
import { useFullscreenMode } from "@/hooks/useFullScreenMode";
import { useVideoNavigation } from "@/hooks/useVideoNavigation";

/**
 * VideoSearch Component
 *
 * A video search interface that allows users to:
 * - Search for videos using text prompts
 * - View videos in a 1-3 slot layout
 * - Auto-advance through search results
 * - Bookmark favorite videos
 * - Toggle fullscreen mode
 */

export default function VideoSearch() {
  // const session = useSession();
  const supabase = useSupabaseClient();

  // Generate a stable demo user ID for development without auth (doesn't work because of the auth.users(id) dependency)
  const demoUserId = useRef(uuidv4()).current;

  // Initialize session tracking for analytics
  const { pageSessionId } = useSessionTracking(supabase, demoUserId); // supabase, session?.user?.id

  // Handle video auto-advance functionality
  const {
    autoAdvance,
    autoAdvanceSeconds,
    toggleAutoAdvanceCheckbox,
    handleIntervalChange,
    handleAutoAdvanceNext,
  } = useAutoAdvance(pageSessionId, supabase);

  // State management
  const [prompt, setPrompt] = useState("");
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(
    new Set()
  );

  // Search functionality using React Query
  const { data, error, isLoading, refetch } = useQuery<SearchResponse>({
    queryKey: ["videoSearch", prompt],
    queryFn: async () => {
      if (!prompt) return null; // || !session?.access_token || !session.user

      const response = await fetch("/api/baseten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt,
          similarity_threshold: 0.1,
          match_count: 20,
          page_session_id: pageSessionId,
          demo_user_id: demoUserId, // comment out after demo
        }),
      });

      const jsonData = await response.json(); // Parse JSON once
      console.log("RESPONSE:", jsonData); // Log the parsed data
      return jsonData; // Return the parsed data
    },
    enabled: false, // Only execute query on form submission
  });

  // Video slot management
  const { slots, setSlots, handleNext, handlePrevious } = useVideoNavigation({
    pageSessionId,
    initialSlots: [
      { isActive: false, videoIndex: 0 }, // Left slot
      { isActive: true, videoIndex: 0 }, // Center slot (always active)
      { isActive: false, videoIndex: 0 }, // Right slot
    ],
    videoCount: data?.matches?.length ?? 0, // Use the length of data.matches dynamically
  });

  // Fullscreen functionality
  const multiPlayerRef = useRef<HTMLDivElement>(
    null
  ) as RefObject<HTMLDivElement>;
  const { isFullscreen, handleFullScreen } = useFullscreenMode({
    pageSessionId,
    containerRef: multiPlayerRef,
  });

  /**
   * Handles search form submission:
   * - Prevents default form behavior
   * - Resets video indices to 0
   * - Maintains active/inactive slot states
   * - Triggers new search
   */
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSlots((prevSlots: Slot[]) => {
      return prevSlots.map((slot, index) => ({
        ...slot,
        videoIndex: 0,
        isActive: index === 1 || slot.isActive,
      }));
    });
    refetch();
  }

  // Auto-advance timer effect
  useEffect(() => {
    if (!autoAdvance || !data?.matches?.length) return;
    const timer = setTimeout(() => {
      slots.forEach((slot: Slot, index: number) => {
        if (slot.isActive) {
          handleAutoAdvanceNext(index, slots, setSlots, data.matches.length);
        }
      });
    }, autoAdvanceSeconds * 1000);
    return () => clearTimeout(timer);
  }, [autoAdvance, autoAdvanceSeconds, slots, data?.matches]);

  /**
   * Bookmark management frontend - for future recommendation system
   */
  function toggleBookmark(videoId: string) {
    setBookmarkedVideos((prev) => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(videoId)) {
        newBookmarks.delete(videoId);
      } else {
        newBookmarks.add(videoId);
      }
      return newBookmarks;
    });
  }

  /** Add left slot (if inactive) */
  function handleAddLeft() {
    setSlots((prev: Slot[]) => {
      const newSlots = [...prev];
      newSlots[0].isActive = true; // left slot
      return newSlots;
    });
  }

  /** Add right slot (if inactive) */
  function handleAddRight() {
    setSlots((prev: Slot[]) => {
      const newSlots = [...prev];
      newSlots[2].isActive = true; // right slot
      return newSlots;
    });
  }

  /** Remove a slot (but never remove the middle slot index=1) */
  function handleRemoveSlot(slotIndex: number) {
    if (slotIndex === 1) return; // skip removing the middle slot
    setSlots((prev: Slot[]) => {
      const newSlots = [...prev];
      newSlots[slotIndex].isActive = false;
      // Optionally reset videoIndex for that slot
      newSlots[slotIndex].videoIndex = 0;
      return newSlots;
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Search section */}
      <section>
        <form onSubmit={handleSearch} className="flex items-center gap-4 mb-4">
          {/* Search input */}
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter search prompt..."
            className="flex-1 px-4 py-2 rounded border border-gray-300 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !prompt}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Auto-advance controls */}
        <div className="flex items-center gap-2 mb-4">
          <label className="font-semibold">Auto-Advance:</label>
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => {
              const currentVideoId = data?.matches[slots[1].videoIndex].id;
              if (currentVideoId) {
                toggleAutoAdvanceCheckbox(e.target.checked, currentVideoId);
              }
            }}
          />
          {autoAdvance && (
            <>
              <label>Seconds per video:</label>
              <input
                type="number"
                value={autoAdvanceSeconds}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className="w-20 border border-gray-300 rounded px-2 py-1"
                min="1"
              />
            </>
          )}
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error.message}
          </div>
        )}
      </section>

      {/* Video controls and player section */}
      <VideoControls
        slots={slots}
        handleAddLeft={handleAddLeft}
        handleAddRight={handleAddRight}
        handleFullScreen={handleFullScreen}
      />

      {/* 3-slot layout */}
      <div className="flex gap-3" ref={multiPlayerRef}>
        {slots.map((slot: Slot, index: number) => {
          const video = data?.matches?.[slot.videoIndex];

          return (
            <VideoSlot
              key={`video-slot-${index}-${video?.id || slot.videoIndex}`} // Added unique key
              isActive={slot.isActive}
              video={data?.matches?.[slot.videoIndex]}
              videoIndex={slot.videoIndex}
              totalVideos={data?.matches?.length ?? 0}
              slotIndex={index}
              isFullscreen={isFullscreen}
              isBookmarked={video?.id ? bookmarkedVideos.has(video.id) : false}
              onNext={() => handleNext(index)}
              onPrevious={() => handlePrevious(index)}
              onRemove={() => handleRemoveSlot(index)}
              onBookmark={toggleBookmark}
            />
          );
        })}
      </div>
    </div>
  );
}
