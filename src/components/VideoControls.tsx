import React from 'react';
import { VideoControlsProps } from '@/types';

/**
 * VideoControls Component
 * 
 * Renders control buttons for video player layout:
 * - Add/remove side video players
 * - Toggle fullscreen mode
 * 
 * @param slots - Current state of video slots
 * @param handleAddLeft - Handler for adding left video player
 * @param handleAddRight - Handler for adding right video player
 * @param handleFullScreen - Handler for toggling fullscreen (compilation) mode
 */
export function VideoControls({ 
  slots, 
  handleAddLeft, 
  handleAddRight, 
  handleFullScreen 
}: VideoControlsProps) {
  return (
    <div className="flex gap-2">
      {/* Conditionally render left player button */}
      {!slots[0].isActive && (
        <button onClick={handleAddLeft} className="px-3 py-1 bg-green-500 text-white rounded">
          Add Left Player
        </button>
      )}

      {/* Conditionally render right player button */}
      {!slots[2].isActive && (
        <button onClick={handleAddRight} className="px-3 py-1 bg-green-500 text-white rounded">
          Add Right Player
        </button>
      )}

      {/* Fullscreen toggle button */}
      <button onClick={handleFullScreen} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">
        Full Screen
      </button>
    </div>
  );
}