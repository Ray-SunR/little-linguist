/**
 * Centralized type definitions for the reader application
 */

export interface BookImage {
  id: string;
  afterWordIndex: number;
  src: string;
  caption: string;
  alt?: string;
  isPlaceholder?: boolean;
}

export interface Book {
  id: string;
  title: string;
  text: string;
  audioUrl?: string;
  images?: BookImage[];
  updated_at?: string;
  voice_id?: string;
}

export type ViewMode = 'continuous' | 'spread' | 'scroll';

// Domain types shared across features
export * from "./domain";
