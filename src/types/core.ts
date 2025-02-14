// src/types/core.ts
export interface Slot {
    isActive: boolean;
    videoIndex: number;
  }
  
  export interface Video {
    id: string;
    presigned_url: string;
    similarity: number;
  }
  
  export interface SearchResult extends Video {
    title: string;
  }
  
  export interface SearchResponse {
    matches: SearchResult[];
    prompt: string;
    threshold: number;
  }
  