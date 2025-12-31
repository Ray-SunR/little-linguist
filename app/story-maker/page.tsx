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
import { compressImage } from "@/lib/core/utils/image";

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
        <div className="min-h-screen page-story-maker p-6 md:p-10">
            <header className="mx-auto mb-8 flex max-w-3xl items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-5 py-2.5 font-bold text-ink shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 border border-white/50"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back
                    </button>
                    <h1 className="text-2xl font-extrabold text-ink md:text-3xl flex items-center gap-3">
                        Story Maker
                        <span className="story-header-icon w-10 h-10">
                            <Wand2 className="h-5 w-5" />
                        </span>
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-3xl">
                {step === "profile" && (
                    <div className="animate-slide-up-fade glass-card p-8 md:p-10">
                        {/* Header with wand icon */}
                        <div className="flex items-center gap-3 mb-8">
                            <Wand2 className="h-8 w-8 text-pink-400" />
                            <h2 className="text-3xl font-bold text-ink">About the Hero</h2>
                        </div>

                        <form onSubmit={handleProfileSubmit}>
                            {/* Two column layout */}
                            <div className="grid md:grid-cols-2 gap-8 mb-8">
                                {/* Left column - Form fields */}
                                <div className="space-y-6">
                                    {/* Hero's Name */}
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-ink-muted">Hero's Name</label>
                                        <input
                                            type="text"
                                            value={profile.name}
                                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                            className="hero-name-input w-full"
                                            placeholder="e.g., Leo, Mia"
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    {/* Age Selector */}
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-ink-muted">Age selector</label>
                                        <div className="age-slider">
                                            <button
                                                type="button"
                                                className="age-slider-btn age-slider-btn-minus"
                                                onClick={() => setProfile({ ...profile, age: Math.max(3, profile.age - 1) })}
                                                disabled={profile.age <= 3}
                                            >
                                                −
                                            </button>
                                            <span className="age-slider-min">3</span>
                                            <span className="age-slider-value">{profile.age}</span>
                                            <span className="age-slider-max">10</span>
                                            <button
                                                type="button"
                                                className="age-slider-btn age-slider-btn-plus"
                                                onClick={() => setProfile({ ...profile, age: Math.min(10, profile.age + 1) })}
                                                disabled={profile.age >= 10}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Gender Selection */}
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-ink-muted">Gender selection</label>
                                        <div className="gender-pills">
                                            <button
                                                type="button"
                                                className={cn("gender-pill", profile.gender === "boy" && "gender-pill-active")}
                                                onClick={() => setProfile({ ...profile, gender: "boy" })}
                                            >
                                                <span className="gender-pill-icon">👦</span>
                                                Boy
                                            </button>
                                            <button
                                                type="button"
                                                className={cn("gender-pill", profile.gender === "girl" && "gender-pill-active")}
                                                onClick={() => setProfile({ ...profile, gender: "girl" })}
                                            >
                                                <span className="gender-pill-icon">👧</span>
                                                Girl
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right column - Photo Upload */}
                                <div className="flex items-center justify-center">
                                    <label className={cn(
                                        "upload-zone-large",
                                        profile.avatarUrl && "upload-zone-large-filled"
                                    )}>
                                        {profile.avatarUrl ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={profile.avatarUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover rounded-2xl"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setProfile({ ...profile, avatarUrl: undefined });
                                                    }}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="upload-zone-content">
                                                {isUploading ? (
                                                    <RefreshCw className="h-10 w-10 text-pink-300 mb-3 animate-spin" />
                                                ) : (
                                                    <Wand2 className="h-10 w-10 text-pink-300 mb-3" />
                                                )}
                                                <span className="font-bold text-ink">
                                                    {isUploading ? "Compressing..." : "Upload Hero Photo"}
                                                </span>
                                                <span className="text-sm text-ink-muted">
                                                    {isUploading ? "Just a moment ✨" : "or drag & drop here"}
                                                </span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIsUploading(true);
                                                    try {
                                                        const compressed = await compressImage(file);
                                                        setProfile({ ...profile, avatarUrl: compressed });
                                                    } catch (err) {
                                                        console.error("Compression failed:", err);
                                                        setError("Failed to process image. Please try another one.");
                                                    } finally {
                                                        setIsUploading(false);
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Full-width Next Button */}
                            <button
                                type="submit"
                                disabled={!profile.name}
                                className="next-step-btn w-full"
                            >
                                <span>Next Step</span>
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </form>
                    </div>
                )}

                {step === "words" && (
                    <div className="animate-slide-up-fade glass-card p-8 md:p-10">
                        {/* Step Progress */}
                        <div className="wizard-progress">
                            <div className="wizard-step wizard-step-complete">
                                <Check className="h-4 w-4" />
                                <span>Hero</span>
                            </div>
                            <div className="wizard-connector wizard-connector-active" />
                            <div className="wizard-step wizard-step-active">
                                <Sparkles className="h-4 w-4" />
                                <span>Words</span>
                            </div>
                        </div>

                        <div className="story-header">
                            <div className="story-header-icon">
                                <Sparkles className="h-7 w-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-ink">Pick Magic Words</h2>
                                <p className="text-ink-muted text-sm">Choose up to 5 words to include in your story</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-red-600 font-bold border border-red-100 flex items-center gap-3">
                                <span className="text-xl">⚠️</span> {error}
                            </div>
                        )}

                        {words.length === 0 ? (
                            <div className="text-center py-12 rounded-2xl border-2 border-dashed border-accent/30 bg-gradient-to-br from-accent/5 to-cta/5">
                                <Sparkles className="h-12 w-12 text-accent/40 mx-auto mb-4" />
                                <p className="font-bold text-ink-muted mb-2">You haven't saved any words yet!</p>
                                <Link href="/reader" className="text-accent underline font-bold hover:text-accent/80 transition-colors">Go read a book</Link> to find words.
                                <div className="mt-8">
                                    <button
                                        onClick={() => {
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
                                                "word-chip",
                                                isSelected && "word-chip-selected"
                                            )}
                                        >
                                            <span>{w.word}</span>
                                            {isSelected && <Check className="h-5 w-5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-6 border-t border-ink/5">
                            <button
                                onClick={() => setStep("profile")}
                                className="flex items-center gap-2 font-bold text-ink-muted hover:text-ink transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="count-badge">{selectedWords.length}</span>
                                    <span className="text-sm font-bold text-ink-muted">/ 5 selected</span>
                                </div>
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
                    <div className="animate-slide-up-fade glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                        <div className="sparkle-container mb-10">
                            {/* Floating sparkle orbs */}
                            <div className="sparkle-orb" style={{ top: '-20px', left: '-30px', animationDelay: '0s' }} />
                            <div className="sparkle-orb" style={{ top: '-25px', right: '-25px', animationDelay: '0.5s' }} />
                            <div className="sparkle-orb" style={{ bottom: '-15px', left: '-20px', animationDelay: '1s' }} />
                            <div className="sparkle-orb" style={{ bottom: '-20px', right: '-30px', animationDelay: '1.5s' }} />

                            {/* Main wand icon */}
                            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-white to-accent/10 shadow-xl magic-wand-enhanced">
                                <div className="absolute inset-0 rounded-full animate-ping bg-accent/20" />
                                <Wand2 className="h-12 w-12 text-accent animate-pulse" />
                            </div>
                        </div>

                        <h2 className="mb-3 text-3xl font-extrabold bg-gradient-to-r from-accent to-pink-500 bg-clip-text text-transparent">
                            Making Magic...
                        </h2>
                        <p className="text-xl text-ink-muted">
                            Writing an adventure for <span className="font-bold text-accent">{profile.name}</span>!
                        </p>
                        <p className="mt-4 text-sm text-ink-muted/70">
                            This usually takes 10-20 seconds ✨
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
