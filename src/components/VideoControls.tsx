import React from 'react';

interface Slot {
  isActive: boolean;
  videoIndex: number;
}

interface VideoControlsProps {
  slots: Slot[];
  handleAddLeft: () => void;
  handleAddRight: () => void;
  handleFullScreen: () => void;
}

export function VideoControls({ 
  slots, 
  handleAddLeft, 
  handleAddRight, 
  handleFullScreen 
}: VideoControlsProps) {
  return (
    <div className="flex gap-2">
      {!slots[0].isActive && (
        <button onClick={handleAddLeft} className="px-3 py-1 bg-green-500 text-white rounded">
          Add Left Player
        </button>
      )}
      {!slots[2].isActive && (
        <button onClick={handleAddRight} className="px-3 py-1 bg-green-500 text-white rounded">
          Add Right Player
        </button>
      )}
      <button onClick={handleFullScreen} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">
        Full Screen
      </button>
    </div>
  );
}