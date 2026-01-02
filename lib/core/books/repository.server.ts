import { createClient } from '@supabase/supabase-js';
import { Book } from '../types';

/**
 * Server-only repository for Book data.
 * This should ONLY be used in API routes or Server Components.
 */
export class BookRepository {
    private supabase;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    async getSystemBooks(): Promise<Partial<Book>[]> {
        const { data, error } = await this.supabase
            .from('books')
            .select('id, book_key, title, origin') // Sparse list
            .eq('origin', 'system')
            .order('title');

        if (error) throw error;
        return data || [];
    }

    async getBookById(idOrSlug: string, options: { includeContent?: boolean, includeMedia?: boolean } = {}): Promise<any | null> {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

        const fields = ['id', 'book_key', 'title', 'origin'];
        if (options.includeContent) fields.push('text');

        const query = this.supabase.from('books').select(fields.join(','));
        if (isUuid) {
            query.eq('id', idOrSlug);
        } else {
            query.eq('book_key', idOrSlug);
        }

        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;

        const result = { ...(data as any) };

        if (options.includeMedia) {
            const { data: media, error: mediaError } = await this.supabase
                .from('book_media')
                .select('*')
                .eq('book_id', data.id)
                .order('after_word_index');

            if (mediaError) throw mediaError;

            // Resolve signed URLs for each media item
            const imagesWithUrls = await Promise.all(media.map(async m => {
                // If path is already a full URL (legacy), use it, otherwise sign it
                let finalUrl = m.path;
                if (!m.path.startsWith('http')) {
                    const { data: signedData, error: signError } = await this.supabase.storage
                        .from('book-assets')
                        .createSignedUrl(m.path, 3600); // 1 hour expiry

                    if (!signError && signedData) {
                        finalUrl = signedData.signedUrl;
                    }
                }

                return {
                    id: m.id,
                    afterWordIndex: m.after_word_index,
                    ...m.metadata,
                    src: finalUrl, // Ensure this wins
                };
            }));

            result.images = imagesWithUrls;
        }

        return result;
    }

    async getNarrationChunks(bookId: string) {
        const { data, error } = await this.supabase
            .from('book_audios')
            .select('*')
            .eq('book_id', bookId)
            .order('chunk_index');

        if (error) throw error;
        return data || [];
    }

    async saveNarrationChunk(payload: any) {
        const { data, error } = await this.supabase
            .from('book_audios')
            .upsert(payload, { onConflict: 'book_id,chunk_index,voice_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    private mapRowToBook(row: any): Book {
        return {
            id: row.id,
            title: row.title,
            text: row.text,
            images: row.images,
            // book_key is stored in db but Book type currently treats id as the primary identifier
            // We might want to add book_key to the Book type in core later if needed.
        };
    }
}
