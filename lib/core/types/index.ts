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
  status?: string;
  retryCount?: number;
  errorMessage?: string;
  sectionIndex?: number;
  prompt?: string;
}

export interface Book {
  id: string;
  title: string;
  text?: string;
  audioUrl?: string;
  updated_at?: string;
  voice_id?: string;
  cover_image_path?: string;
  owner_user_id?: string | null;
  child_id?: string | null;
  origin?: 'system' | 'user_generated' | 'ai_generated';
  total_tokens?: number;
  metadata?: Record<string, any>;
}

export type ViewMode = 'continuous' | 'spread' | 'scroll';

// Domain types shared across features
export * from "./domain";
