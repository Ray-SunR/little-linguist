import { Book, BookImage } from '../types';

/**
 * Minimal book metadata for library view display.
 * This type contains only the data needed to render book cards,
 * avoiding the overhead of full book content (text, tokens, narration).
 */
export interface LibraryBookCard {
    id: string;
    title: string;
    coverImageUrl?: string;
    coverPath?: string;
    updated_at?: string;
    createdAt?: string;
    voice_id?: string;
    owner_user_id?: string | null;
    progress?: {
        last_token_index?: number;
        total_tokens?: number;
    };
    totalTokens?: number;
    estimatedReadingTime?: number;
    isRead?: boolean;
    lastOpenedAt?: string;
    isFavorite?: boolean;
    level?: string;
    isNonFiction?: boolean;
    origin?: string;
    description?: string;
    minGrade?: number;
}

export const TOKENS_PER_MINUTE = 350;

export function isValidUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export interface BookFilters {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    level?: string;
    origin?: string;
    is_nonfiction?: boolean;
    category?: string;
    is_favorite?: boolean;
    only_personal?: boolean;
    only_public?: boolean;
    duration?: string;
    ids?: string[];
}

export interface BookWithCover {
    id: string;
    title: string;
    coverImageUrl?: string;
    coverPath?: string;
    updated_at?: string;
    voice_id?: string;
    owner_user_id?: string | null;
    child_id?: string | null;
    totalTokens?: number;
    estimatedReadingTime?: number;
    isRead?: boolean;
    lastOpenedAt?: string;
    isFavorite?: boolean;
    level?: string;
    isNonFiction?: boolean;
    origin?: string;
    description?: string;
    keywords?: string[];
    minGrade?: number;
    progress?: {
        last_token_index?: number;
        is_completed?: boolean;
        total_read_seconds?: number;
        last_read_at?: string;
    };
    createdAt?: string;
}

export interface NarrationChunk {
    id: string;
    chunk_index: number;
    start_word_index: number;
    end_word_index: number;
    audio_path: string;
    storagePath: string;
    timings: any[];
}

export interface BookDetail extends Book {
    images: BookImage[] | null;
    tokens?: any;
    text?: string;
    coverImageUrl?: string;
    coverPath?: string;
    audios?: NarrationChunk[];
    assetTimestamps: {
        metadata: string | null;
        text: string | null;
        tokens: string | null;
        images: string | null;
        audios: string | null;
    };
}
