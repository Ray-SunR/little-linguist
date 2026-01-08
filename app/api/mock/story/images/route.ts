import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { StoryRepository } from '@/lib/core/stories/repository.server';

export async function POST(req: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    try {
        const { bookId, sceneIndex } = await req.json();

        if (!bookId) {
            return NextResponse.json({ error: "bookId is required" }, { status: 400 });
        }

        const storyRepo = new StoryRepository(supabase);
        const story = await storyRepo.getStoryById(bookId, user?.id);

        if (!story) {
            return NextResponse.json({ error: "Story meta not found or unauthorized" }, { status: 404 });
        }

        const scenes = story.scenes || [];

        if (scenes.length === 0) {
            return NextResponse.json({ error: "No scenes found in story" }, { status: 400 });
        }

        const results = [];
        const indicesToGenerate = sceneIndex !== undefined
            ? [sceneIndex]
            : scenes.map((_: any, i: number) => i);

        for (const i of indicesToGenerate) {
            const scene = scenes[i];
            if (!scene) continue;


            // Simulate latency
            await new Promise(resolve => setTimeout(resolve, 800));

            const imageNumber = (i % 5) + 1;
            const localMockPath = path.join(process.cwd(), 'data', 'mock', `${imageNumber}.png`);

            if (fs.existsSync(localMockPath)) {
                const buffer = fs.readFileSync(localMockPath);
                const storagePath = `${bookId}/images/scene-${i}-mock.png`;

                await supabase.storage.from('book-assets').upload(storagePath, buffer, {
                    contentType: 'image/png',
                    upsert: true
                });

                await supabase.from('book_media').upsert({
                    book_id: bookId,
                    media_type: 'image',
                    path: storagePath,
                    after_word_index: scene.after_word_index,
                    metadata: {
                        caption: `Mock Illustration for scene ${i + 1}`,
                        alt: scene.image_prompt,
                        isMock: true
                    }
                }, { onConflict: 'book_id,path' });

                results.push({ sceneIndex: i, storagePath });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Mock Image generation API error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate mock images" }, { status: 500 });
    }
}
