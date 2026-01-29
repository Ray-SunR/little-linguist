import { useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { draftManager, getStoryService } from "@/lib/features/story";
import { createChildProfile, switchActiveChild as serverSwitchActiveChild } from "@/app/actions/profiles";
import { generateUUID } from "@/lib/core/utils/uuid";
import type { Story, UserProfile, StoryStatus } from "@/lib/features/story/types";
import { raidenCache, CacheStore } from "@/lib/core/cache";

const TIMEOUT_MS = 120000;

export interface StoryOrchestratorOptions {
    state: {
        status: StoryStatus;
        error?: string;
        idempotencyKey?: string;
    };
    actions: {
        startGenerating: (idempotencyKey: string) => void;
        startMigrating: () => void;
        startConfiguring: () => void;
        setSuccess: (storyId: string) => void;
        setError: (error: string) => void;
    };
}

export function useStoryOrchestrator({ state, actions }: StoryOrchestratorOptions) {
    const { user, activeChild, isLoading, refreshProfiles, setActiveChild: clientSetActiveChild, setIsStoryGenerating } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const service = getStoryService();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const processingRef = useRef(false);

    const clearTimeouts = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => clearTimeouts();
    }, [clearTimeouts]);

    const generateStory = useCallback(async (
        words: string[],
        profile: UserProfile,
        storyLengthMinutes: number,
        imageSceneCount: number,
        idempotencyKey?: string
    ) => {
        const finalIdempotencyKey = idempotencyKey || state.idempotencyKey || generateUUID();
        
        if (!user) {
            const guestDraftData = { 
                profile, 
                selectedWords: words, 
                storyLengthMinutes, 
                imageSceneCount, 
                idempotencyKey: finalIdempotencyKey,
                updatedAt: Date.now()
            };
            await draftManager.saveDraft("draft:guest", guestDraftData);
            router.push(`/login?returnTo=${encodeURIComponent("/story-maker?action=resume_story_maker")}`);
            return;
        }

        actions.startGenerating(finalIdempotencyKey);
        setIsStoryGenerating(true);

        clearTimeouts();
        timeoutRef.current = setTimeout(() => {
            actions.setError("The magic is taking longer than expected. Please try again or check your library.");
            setIsStoryGenerating(false);
        }, TIMEOUT_MS);

        try {
            let currentProfile = profile;
            
            if (!currentProfile.id) {
                const result = await createChildProfile({
                    first_name: currentProfile.name,
                    birth_year: new Date().getFullYear() - currentProfile.age,
                    gender: currentProfile.gender,
                    interests: currentProfile.interests || [],
                    avatar_asset_path: currentProfile.avatarStoragePath || "",
                    avatar_paths: currentProfile.avatarStoragePath ? [currentProfile.avatarStoragePath] : []
                });

                if (result.success && result.data) {
                    currentProfile = { ...currentProfile, id: result.data.id };
                    clientSetActiveChild(result.data);
                    await refreshProfiles(true);
                } else {
                    throw new Error(result.error || "Failed to create profile");
                }
            }

            const content = await service.generateStoryContent(
                words, 
                currentProfile, 
                storyLengthMinutes, 
                imageSceneCount, 
                finalIdempotencyKey
            );

            const initialStory: Story = {
                id: generateUUID(),
                book_id: content.book_id,
                title: content.title,
                content: content.content,
                sections: content.sections,
                createdAt: Date.now(),
                wordsUsed: words,
                userProfile: currentProfile,
                mainCharacterDescription: content.mainCharacterDescription
            };

            const initialBook = {
                id: content.book_id,
                title: content.title,
                text: content.content,
                tokens: content.tokens || [],
                shards: [],
                images: content.sections.map((s, idx) => ({
                    id: `section-${idx}`,
                    src: "",
                    afterWordIndex: Number(s.after_word_index),
                    caption: "Drawing Magic...",
                    prompt: s.image_prompt,
                    isPlaceholder: true,
                    sectionIndex: idx
                }))
            };

            console.log("[StoryOrchestrator] Generation successful, bookId:", content.book_id);
            try {
                await raidenCache.put(CacheStore.BOOKS, initialBook as any);
                await raidenCache.delete(CacheStore.LIBRARY_METADATA, user.id);
                console.log("[StoryOrchestrator] Cache updated.");
            } catch (cacheErr) {
                console.warn("[StoryOrchestrator] Cache update failed (non-fatal):", cacheErr);
            }

            try {
                await raidenCache.delete(CacheStore.DRAFTS, "draft:guest");
                console.log("[StoryOrchestrator] Guest draft purged.");
            } catch (purgeErr) {
                console.warn("[StoryOrchestrator] Guest draft purge failed (non-fatal):", purgeErr);
            }

            clearTimeouts();
            console.log("[StoryOrchestrator] Redirecting to reader via window.location...");
            window.location.href = `/reader/${content.book_id}`;
            
            setTimeout(() => {
                if (processingRef.current) {
                    actions.setSuccess(initialStory.id);
                }
            }, 100);
        } catch (err: any) {
            clearTimeouts();
            actions.setError(err.message || "Oops! Something went wrong.");
        } finally {
            setIsStoryGenerating(false);
            processingRef.current = false;
        }
    }, [user, state.idempotencyKey, actions, setIsStoryGenerating, clearTimeouts, router, clientSetActiveChild, refreshProfiles, service]);

    useEffect(() => {
        const handleMigration = async () => {
            const action = searchParams.get("action");
            const isResuming = action === "resume_story_maker";

            if (!user || isLoading || processingRef.current) return;
            
            if (isResuming) {
                console.log("[StoryOrchestrator] Clearing resume intent from URL.");
                router.replace(pathname, { scroll: false });
                
                if (state.status !== "MIGRATING") {
                    actions.startMigrating();
                    return; 
                }
            }

            if (state.status !== "MIGRATING") return;

            processingRef.current = true;
            console.log("[StoryOrchestrator] Starting migration logic.");


            try {
                const guestDraft = await draftManager.getDraft("draft:guest");
                const userDraftKey = activeChild?.id ? `draft:${user.id}:${activeChild.id}` : `draft:${user.id}`;
                
                if (guestDraft) {
                    console.info("[StoryOrchestrator] Migrating guest draft...");
                    await draftManager.migrateGuestDraft("draft:guest", userDraftKey);
                    await generateStory(
                        guestDraft.selectedWords, 
                        guestDraft.profile, 
                        guestDraft.storyLengthMinutes, 
                        guestDraft.imageSceneCount, 
                        guestDraft.idempotencyKey
                    );
                } else {
                    const userDraft = await draftManager.getDraft(userDraftKey);
                    if (userDraft) {
                        console.info("[StoryOrchestrator] Resuming from user draft...");
                        await generateStory(
                            userDraft.selectedWords, 
                            userDraft.profile, 
                            userDraft.storyLengthMinutes, 
                            userDraft.imageSceneCount, 
                            userDraft.idempotencyKey
                        );
                    } else {
                        console.warn("[StoryOrchestrator] No draft found, resetting to configuring.");
                        actions.startConfiguring();
                    }
                }
            } catch (err) {
                console.error("[StoryOrchestrator] Migration failed:", err);
                actions.startConfiguring();
            } finally {
                processingRef.current = false;
                router.replace(pathname, { scroll: false });
            }
        };

        handleMigration();
    }, [user, isLoading, state.status, searchParams, activeChild, pathname, router, actions, generateStory]);

    return {
        generateStory
    };
}
