import React, { useState, useEffect, useRef } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { v4 as uuidv4 } from "uuid";

interface SearchResult {
  id: string;
  title: string;
  presigned_url: string;
  similarity: number;
}

interface SearchResponse {
  matches: SearchResult[];
  prompt: string;
  threshold: number;
}

interface Slot {
  isActive: boolean; // Whether this slot is visible
  videoIndex: number; // Which search-result index it's currently showing
}

export default function VideoSearch() {
  const session = useSession();
  const supabase = useSupabaseClient();

  // ---------------------------
  // 1. SESSION TRACKING STATE
  // ---------------------------
  const [pageSessionId, setPageSessionId] = useState<string | null>(null);

  // For auto-advance tracking
  const [autoAdvanceStartTime, setAutoAdvanceStartTime] = useState<number>(0);

  // For compilation-mode tracking
  const [compilationModeSessionId, setCompilationModeSessionId] = useState<
    string | null
  >(null);

  // ---------------------------
  // 2. EXISTING STATE
  // ---------------------------
  const [prompt, setPrompt] = useState("");
  // The 3-slot layout: left, center, right
  // Middle slot is active by default
  const [slots, setSlots] = useState<Slot[]>([
    { isActive: false, videoIndex: 0 }, // Left slot !!! TODO: RANDOM INDICES
    { isActive: true, videoIndex: 0 }, // Center slot
    { isActive: false, videoIndex: 0 }, // Right slot
  ]);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(
    new Set()
  );
  // Automatic skip toggles
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // For MultiPlayer Fullscreen
  const multiPlayerRef = useRef<HTMLDivElement>(null);

  // ---------------------------
  // 3. START/END SESSION
  // ---------------------------
  // Initialize page session on component mount
  useEffect(() => {
    if (!session?.user?.id) return;

    const newSessionId = uuidv4();
    setPageSessionId(newSessionId);

    const startSession = async () => {
      try {
        await supabase.from("page_sessions").insert([
          {
            id: newSessionId,
            user_id: session.user.id,
          },
        ]);
      } catch (error) {
        console.error("Failed to start session:", error);
      }
    };

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

    startSession();

    // End session handlers
    window.addEventListener("beforeunload", endSession);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) endSession();
    });

    return () => {
      window.removeEventListener("beforeunload", endSession);
      document.removeEventListener("visibilitychange", endSession);
      endSession();
    };
  }, [session?.user?.id, supabase]);

  // ---------------------------
  // 4. REACT QUERY for Searching
  // ---------------------------
  // React Query for searching
  const { data, error, isLoading, refetch } = useQuery<SearchResponse>({
    queryKey: ["videoSearch", prompt],
    queryFn: async () => {
      if (!prompt || !session?.access_token || !session.user) return null;

      const response = await fetch("/api/baseten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt,
          similarity_threshold: 0.1,
          match_count: 20,
          page_session_id: pageSessionId,
        }),
      });

      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: false, // only run when form is submitted
  });

  /** Handle form submission */
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Reset the middle slot to index 0 (or any default)
    // and preserve active players
    setSlots((prevSlots) => {
      return prevSlots.map((slot, index) => ({
        ...slot,
        videoIndex: 0, // Reset to the first video for all slots
        isActive: index === 1 || slot.isActive, // Keep current state unless it's the middle slot
      }));
    });

    refetch();
  }

  // ---------------------------
  // 5. VIDEO NAVIGATION EVENTS
  // ---------------------------
  /** Handle going to the next video for a specific slot */
  async function handleNext(slotIndex: number) {
    if (!data?.matches) return;

    const currentVideoId = data.matches[slots[slotIndex].videoIndex].id;

    if (pageSessionId) {
      await supabase.from("video_interactions").insert([
        {
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "NEXT",
        },
      ]);
    }

    setSlots((prevSlots) => {
      return prevSlots.map((slot, index) => {
        if (index === slotIndex) {
          return {
            ...slot,
            videoIndex: (slot.videoIndex + 1) % data.matches.length, // Move to next video sequentially
          };
        }
        return slot;
      });
    });
  }

  function handleAutoAdvanceNext(slotIndex: number) {
    if (!data?.matches) return;
    
    setSlots((prevSlots) => {
      return prevSlots.map((slot, index) => {
        if (index === slotIndex) {
          return {
            ...slot,
            videoIndex: (slot.videoIndex + 1) % data.matches.length,
          };
        }
        return slot;
      });
    });
  }

  /** Handle going to the previous video for a specific slot */
  async function handlePrevious(slotIndex: number) {
    if (!data?.matches) return;

    const currentVideoId = data.matches[slots[slotIndex].videoIndex].id;
    
    // Log to video_interactions
    if (pageSessionId) {
      await supabase.from("video_interactions").insert([
        {
          session_id: pageSessionId,
          video_id: currentVideoId,
          event_type: "PREV",
        },
      ]);
    }
    setSlots((prevSlots) => {
      return prevSlots.map((slot, index) => {
        if (index === slotIndex) {
          return {
            ...slot,
            videoIndex:
              slot.videoIndex === 0
                ? data.matches.length - 1
                : slot.videoIndex - 1, // Move to previous video sequentially
          };
        }
        return slot;
      });
    });
  }

  // ---------------------------
  // 6. AUTO-ADVANCE TOGGLE
  // ---------------------------
  async function toggleAutoAdvanceCheckbox(checked: boolean) {
    if (!data?.matches) return;

    const currentVideoId = data.matches[slots[1].videoIndex].id;

    if (checked) {
      // AUTO_ADVANCE_START
      setAutoAdvanceStartTime(Date.now());
      if (pageSessionId) {
        await supabase.from("video_interactions").insert([
          {
            session_id: pageSessionId,
            video_id: currentVideoId,
            event_type: "AUTO_ADVANCE_START",
          },
        ]);
      }
    } else {
      const elapsed = Math.floor((Date.now() - autoAdvanceStartTime) / 1000);
      if (pageSessionId) {
        await supabase.from("video_interactions").insert([
          {
            session_id: pageSessionId,
            video_id: currentVideoId,
            event_type: "AUTO_ADVANCE_STOP",
            auto_advance_duration: elapsed,
          },
        ]);
      }
    }
    setAutoAdvance(checked);
  }

  // ---------------------------
  // 7. AUTO-ADVANCE INTERVAL (Debounced)
  // ---------------------------
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  function handleIntervalChange(value: number) {
    setAutoAdvanceSeconds(value);
    if (debounceTimer) clearTimeout(debounceTimer);

    // Wait 2s (or 30s) before logging interval to the DB
    const newTimer = setTimeout(async () => {
      if (!pageSessionId) return;
      await supabase.from("auto_advance_intervals").insert([
        {
          session_id: pageSessionId,
          interval_set: value,
        },
      ]);
    }, 2000); // shorter for demo, use 30000 in production

    setDebounceTimer(newTimer);
  }

  /** Auto-advance effect */
  useEffect(() => {
    if (!autoAdvance || !data?.matches?.length) return;

    const timer = setTimeout(() => {
      slots.forEach((slot, index) => {
        if (slot.isActive) {
          handleAutoAdvanceNext(index);
        }
      });
    }, autoAdvanceSeconds * 1000);

    return () => clearTimeout(timer);
  }, [autoAdvance, autoAdvanceSeconds, slots, data?.matches]);

  // ---------------------------
  // 8. FULLSCREEN (Compilation Mode)
  // ---------------------------
  /** Go fullscreen on the 3-slot container */
  const handleFullScreen = async () => {
    if (multiPlayerRef.current) {
      if (!isFullscreen) {
        // ENTER compilation mode
        if (multiPlayerRef.current.requestFullscreen) {
          multiPlayerRef.current.requestFullscreen();
        } else if ((multiPlayerRef.current as any).webkitRequestFullscreen) {
          (multiPlayerRef.current as any).webkitRequestFullscreen();
        }
        if (pageSessionId) {
          // Insert a row in compilation_mode_sessions
          const { data, error } = await supabase.from("compilation_mode_sessions").insert([
            { session_id: pageSessionId, entered_at: new Date().toISOString() }
          ]).select(); // select() to return the inserted row
  
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
    }
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ---------------------------
  // 9. Bookmarking (no table schema given, but sample usage)
  // ---------------------------
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

  // ---------------------------
  // 10. ADDITIONAL UI LOGIC (unchanged)
  // ---------------------------
  /** Add left slot (if inactive) */
  function handleAddLeft() {
    setSlots((prev) => {
      const newSlots = [...prev];
      newSlots[0].isActive = true; // left slot
      return newSlots;
    });
  }

  /** Add right slot (if inactive) */
  function handleAddRight() {
    setSlots((prev) => {
      const newSlots = [...prev];
      newSlots[2].isActive = true; // right slot
      return newSlots;
    });
  }

  /** Remove a slot (but never remove the middle slot index=1) */
  function handleRemoveSlot(slotIndex: number) {
    if (slotIndex === 1) return; // skip removing the middle slot
    setSlots((prev) => {
      const newSlots = [...prev];
      newSlots[slotIndex].isActive = false;
      // Optionally reset videoIndex for that slot
      newSlots[slotIndex].videoIndex = 0;
      return newSlots;
    });
  }


  // ---------------------------
  // 11. RENDER
  // ---------------------------
  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* FORM */}
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
          onChange={(e) => toggleAutoAdvanceCheckbox(e.target.checked)}
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

      {/* ADD/REMOVE SLOT BUTTONS */}
      <div className="flex gap-2">
        {!slots[0].isActive && (
          <button
            onClick={handleAddLeft}
            className="px-3 py-1 bg-green-500 text-white rounded"
          >
            Add Left Player
          </button>
        )}
        {!slots[2].isActive && (
          <button
            onClick={handleAddRight}
            className="px-3 py-1 bg-green-500 text-white rounded"
          >
            Add Right Player
          </button>
        )}
        <button
          onClick={handleFullScreen}
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Full Screen
        </button>
      </div>

      {/* 3-SLOT LAYOUT */}
      <div className="flex gap-3" ref={multiPlayerRef}>
        {slots.map((slot, index) => {
          if (!slot.isActive) return null; // skip inactive slots

          const video = data?.matches?.[slot.videoIndex];
          if (!video) {
            return (
              <div key={index} className="flex-1">
                <div className="bg-gray-100 h-64 flex items-center justify-center">
                  <p className="text-gray-500">Please search for videos</p>
                </div>
              </div>
            );
          }

          return (
            <div key={index} className="flex-1 space-y-2">
              {/* Video & Bookmark Wrapper */}
              <div
                className={`relative group ${
                  isFullscreen ? "h-[100vh]" : "h-[50vh]"
                } w-full flex justify-center items-center`}
              >
                {/* Video */}
                <video
                  src={video.presigned_url}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  loop
                  playsInline
                  muted
                />

                {/* Bookmark Icon */}
                <div
                  className="absolute top-2 right-2 bg-white rounded-full p-1 cursor-pointer shadow-md transition-opacity opacity-0 group-hover:opacity-100"
                  onClick={() => toggleBookmark(video.id)}
                >
                  {bookmarkedVideos.has(video.id) ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M5 3a1 1 0 011-1h12a1 1 0 011 1v17.79c0 .45-.54.67-.85.35L12 14.5l-6.15 6.64c-.31.31-.85.1-.85-.35V3z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-gray-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 3v17.79c0 .45.54.67.85.35L12 14.5l6.15 6.64c.31.31.85.1.85-.35V3a1 1 0 00-1-1H6a1 1 0 00-1 1z"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* NAVIGATION & REMOVE BUTTON */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handlePrevious(index)}
                  className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Prev
                </button>
                <div className="text-xs text-gray-600">
                  Slot {index === 0 ? "Left" : index === 1 ? "Center" : "Right"}
                  <br />
                  Video {slot.videoIndex + 1} of {data?.matches.length}
                  <br />
                  Similarity: {(video.similarity * 100).toFixed(1)}%
                </div>
                <button
                  onClick={() => handleNext(index)}
                  className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
              {/* Remove button, disabled for the center slot */}
              {index !== 1 && ( // Can't remove center
                <button
                  onClick={() => handleRemoveSlot(index)}
                  className="w-full px-2 py-1 bg-red-500 text-white rounded"
                >
                  Remove {index === 0 ? "Left" : "Right"} Slot
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
