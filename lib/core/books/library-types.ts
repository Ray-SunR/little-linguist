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
    voice_id?: string;
    owner_user_id?: string | null;
    progress?: {
        last_token_index?: number;
        total_tokens?: number;
    };
    estimatedReadingTime?: number;
    isRead?: boolean;
    lastOpenedAt?: string;
    isFavorite?: boolean;
}
