/**
 * Centralized type definitions for the reader application
 */

export interface BookImage {
  id: string;
  afterWordIndex: number;
  src: string;
  caption: string;
  alt?: string;
}

export interface Book {
  id: string;
  title: string;
  text: string;
  audioUrl?: string;
  images?: BookImage[];
}

export type ViewMode = 'continuous' | 'spread' | 'scroll';

// Domain types shared across features
export * from "./domain";
