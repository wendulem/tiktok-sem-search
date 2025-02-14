import React from 'react';

interface Video {
  id: string;
  presigned_url: string;
  similarity: number;
}

interface VideoSlotProps {
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

export function VideoSlot({
  isActive,
  video,
  videoIndex,
  totalVideos,
  slotIndex,
  isFullscreen,
  isBookmarked,
  onNext,
  onPrevious,
  onRemove,
  onBookmark
}: VideoSlotProps) {
  if (!isActive) return null;

  if (!video) {
    return (
      <div className="flex-1">
        <div className="bg-gray-100 h-64 flex items-center justify-center">
          <p className="text-gray-500">Please search for videos</p>
        </div>
      </div>
    );
  }

  const slotPosition = slotIndex === 0 ? "Left" : slotIndex === 1 ? "Center" : "Right";

  return (
    <div className="flex-1 space-y-2">
      <div className={`relative group ${
        isFullscreen ? "h-screen" : "h-96"
      } w-full flex justify-center items-center`}>
        <video
          src={video.presigned_url}
          className="w-full h-full object-contain"
          controls
          autoPlay
          loop
          playsInline
          muted
        />
        
        <button
          className="absolute top-2 right-2 bg-white rounded-full p-1 cursor-pointer shadow-md transition-opacity opacity-0 group-hover:opacity-100"
          onClick={() => onBookmark(video.id)}
        >
          {isBookmarked ? (
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
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Prev
        </button>
        <div className="text-xs text-gray-600">
          Slot {slotPosition}
          <br />
          Video {videoIndex + 1} of {totalVideos}
          <br />
          Similarity: {(video.similarity * 100).toFixed(1)}%
        </div>
        <button
          onClick={onNext}
          className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Next
        </button>
      </div>

      {slotIndex !== 1 && (
        <button
          onClick={onRemove}
          className="w-full px-2 py-1 bg-red-500 text-white rounded"
        >
          Remove {slotPosition} Slot
        </button>
      )}
    </div>
  );
}