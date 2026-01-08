/**
 * Centralized type definitions for the reader application
 */

export interface BookImage {
  id: string;
  afterWordIndex: number;
  src: string;
  caption: string;
  alt?: string;
  storagePath?: string; // Optional stable path for caching
  isPlaceholder?: boolean;
}

export interface Book {
  id: string;
  title: string;
  text: string;
  audioUrl?: string;
  updated_at?: string;
  voice_id?: string;
  cover_image_path?: string;
}

export type ViewMode = 'continuous' | 'spread' | 'scroll';

// Domain types shared across features
export * from "./domain";
