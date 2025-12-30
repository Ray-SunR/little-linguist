"use client";

import Link from "next/link";
import { ArrowLeft, Wand2, BookOpen, Sparkles, Check, ChevronRight, User, RefreshCw } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/core";
import { getStoryService } from "@/lib/features/story";
import type { Story, UserProfile } from "@/lib/features/story";
import ReaderShell from "@/components/reader/reader-shell";

type Step = "profile" | "words" | "generating" | "reading";

export default function StoryMakerPage() {
    const { words } = useWordList();
    const router = useRouter();
    const service = getStoryService();
    const [step, setStep] = useState<Step>("profile");
    const [profile, setProfile] = useState<UserProfile>({
        name: "",
        age: 6,
        gender: "boy",
    });
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [story, setStory] = useState<Story | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile.name) return;
        setStep("words");
    };

    const toggleWord = (word: string) => {
        if (selectedWords.includes(word)) {
            setSelectedWords(selectedWords.filter((w) => w !== word));
        } else {
            if (selectedWords.length >= 5) return; // Max 5 words
            setSelectedWords([...selectedWords, word]);
        }
    };

    const generateStory = async () => {
        setStep("generating");
        setError(null);
        try {
            // Step 1: Generate Text/Scenes Content
            const content = await service.generateStoryContent(selectedWords, profile);

            const initialStory: Story = {
                id: crypto.randomUUID(),
                title: content.title,
                content: content.content,
                scenes: content.scenes,
                createdAt: Date.now(),
                wordsUsed: selectedWords,
                userProfile: profile,
                mainCharacterDescription: content.mainCharacterDescription,
            };

            setStory(initialStory);
            setStep("reading");
            setCurrentPage(0);

            // Step 2: Generate Images Progressively in background
            const CONCURRENCY_LIMIT = 2; // Lower concurrency in UI to be safe
            const updatedScenes = [...content.scenes];

            // Helper to update state with new image
            const updateImage = (index: number, url: string) => {
                setStory(prev => {
                    if (!prev) return prev;
                    const newScenes = [...prev.scenes];
                    newScenes[index] = { ...newScenes[index], imageUrl: url };
                    return { ...prev, scenes: newScenes };
                });
            };

            for (let i = 0; i < updatedScenes.length; i += CONCURRENCY_LIMIT) {
                const chunk = Array.from({ length: Math.min(CONCURRENCY_LIMIT, updatedScenes.length - i) }, (_, k) => i + k);
                await Promise.all(chunk.map(async (index) => {
                    const imageUrl = await service.generateImageForScene(updatedScenes[index], profile, content.mainCharacterDescription);
                    if (imageUrl) {
                        updateImage(index, imageUrl);
                    }
                }));
            }

        } catch (err) {
            console.error(err);
            setError("Oops! Something went wrong while making your story. Please try again.");
            setStep("words");
        }
    };

    const reset = () => {
        setStep("profile");
        setStory(null);
        setSelectedWords([]);
        setError(null);
    };

    return (
        <div className="min-h-screen bg-shell p-6 md:p-10">
            <header className="mx-auto mb-10 flex max-w-3xl items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back
                    </button>
                    <h1 className="text-2xl font-extrabold text-ink md:text-3xl flex items-center gap-2">
                        Story Maker <Wand2 className="h-6 w-6 text-accent" />
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-3xl">
                {step === "profile" && (
                    <div className="animate-slide-down card-frame rounded-card bg-white p-8 shadow-lg">
                        <div className="mb-6 flex items-center gap-3 text-accent">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                                <User className="h-6 w-6" />
                            </div>
                            <h2 className="text-2xl font-bold">About the Hero</h2>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div>
                                <label className="mb-2 block font-bold text-ink-muted">Hero's Name</label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    className="pill-input w-full text-lg"
                                    placeholder="e.g. Charlie"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="mb-2 block font-bold text-ink-muted">Age</label>
                                    <input
                                        type="number"
                                        value={profile.age}
                                        onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                                        className="pill-input w-full text-lg"
                                        min={3}
                                        max={12}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block font-bold text-ink-muted">Gender</label>
                                    <select
                                        value={profile.gender}
                                        onChange={(e) =>
                                            setProfile({ ...profile, gender: e.target.value as UserProfile["gender"] })
                                        }
                                        className="pill-input w-full text-lg appearance-none"
                                    >
                                        <option value="boy">Boy</option>
                                        <option value="girl">Girl</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between items-end">
                                <div className="flex flex-col gap-2">
                                    <label className="block font-bold text-ink-muted">Hero's Photo (Optional)</label>
                                    <div className="flex items-center gap-4">
                                        <label className="cursor-pointer group flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 transition-all hover:border-accent hover:bg-accent/10">
                                            {profile.avatarUrl ? (
                                                <img
                                                    src={profile.avatarUrl}
                                                    alt="Preview"
                                                    className="h-full w-full rounded-2xl object-cover"
                                                />
                                            ) : (
                                                <>
                                                    <Sparkles className="h-8 w-8 text-accent/50 group-hover:text-accent" />
                                                    <span className="text-xs font-bold text-accent/50 group-hover:text-accent">Upload</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setProfile({ ...profile, avatarUrl: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {profile.avatarUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setProfile({ ...profile, avatarUrl: undefined })}
                                                className="text-sm font-bold text-red-500 hover:underline"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-ink-muted">Used to make the hero look like you!</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!profile.name}
                                    className="primary-btn flex items-center gap-2 text-lg h-fit"
                                >
                                    Next Step <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {step === "words" && (
                    <div className="animate-slide-down card-frame rounded-card bg-white p-8 shadow-lg">
                        <div className="mb-6 flex items-center gap-3 text-accent">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <h2 className="text-2xl font-bold">Pick Magic Words</h2>
                        </div>

                        <p className="mb-6 text-lg text-ink-muted">
                            Choose up to 5 words from your collection to include in the story.
                        </p>

                        {error && (
                            <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-600 font-bold border border-red-100 flex items-center gap-2">
                                <span className="text-xl">⚠️</span> {error}
                            </div>
                        )}

                        {words.length === 0 ? (
                            <div className="text-center py-10 bg-shell-2 rounded-xl border-dashed border-2 border-accent/20">
                                <p className="font-bold text-ink-muted mb-4">You haven't saved any words yet!</p>
                                <Link href="/reader" className="text-accent underline font-bold">Go read a book</Link> to find words.
                                <div className="mt-8">
                                    <button
                                        onClick={() => {
                                            // Bypass for "I have no words" case - maybe let them type one? 
                                            // For MVP, just let them skip word selection or use default words?
                                            // Let's implement Skipping
                                            generateStory();
                                        }}
                                        className="ghost-btn"
                                    >
                                        Skip & Create Story without words
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {words.map((w) => {
                                    const isSelected = selectedWords.includes(w.word);
                                    return (
                                        <button
                                            key={w.word}
                                            onClick={() => toggleWord(w.word)}
                                            className={cn(
                                                "group relative flex items-center justify-between rounded-2xl border-2 px-4 py-3 font-bold transition-all",
                                                isSelected
                                                    ? "border-accent bg-accent text-white shadow-md transform scale-[1.02]"
                                                    : "border-transparent bg-shell-2 text-ink hover:bg-accent/10"
                                            )}
                                        >
                                            <span>{w.word}</span>
                                            {isSelected && <Check className="h-5 w-5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-ink/5">
                            <button
                                onClick={() => setStep("profile")}
                                className="font-bold text-ink-muted hover:text-ink transition-colors"
                            >
                                Back
                            </button>

                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-ink-muted">
                                    {selectedWords.length}/5 selected
                                </span>
                                <button
                                    onClick={generateStory}
                                    className="primary-btn flex items-center gap-2 text-lg"
                                >
                                    Create Story <Wand2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === "generating" && (
                    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 animate-ping rounded-full bg-accent/20"></div>
                            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl">
                                <Wand2 className="h-10 w-10 animate-pulse text-accent" />
                            </div>
                        </div>
                        <h2 className="mb-2 text-3xl font-extrabold text-accent">Making Magic...</h2>
                        <p className="text-xl text-ink-muted">
                            Writing a story for {profile.name}!
                        </p>
                    </div>
                )}

                {step === "reading" && story && (
                    <div className="fixed inset-0 z-[100] page-sky h-screen overflow-hidden px-4 py-4">
                        <ReaderShell
                            books={[service.convertStoryToBook(story)]}
                            initialINarrationProvider={process.env.NEXT_PUBLIC_NARRATION_PROVIDER}
                        />

                        {/* Status overlay for background generation */}
                        {story.scenes.some(s => !s.imageUrl) && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-white/80 px-6 py-2 shadow-lg backdrop-blur-md border border-accent/20 animate-slide-up z-[110]">
                                <RefreshCw className="h-4 w-4 animate-spin text-accent" />
                                <span className="text-sm font-bold text-ink-muted">AI is drawing images...</span>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
