"use client";

import Link from "next/link";
import { ArrowLeft, Wand2, BookOpen, Sparkles, Check, ChevronRight, User, RefreshCw } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/core";
import { getStoryService } from "@/lib/features/story";
import type { Story, UserProfile } from "@/lib/features/story";

type Step = "profile" | "words" | "generating" | "reading";

export default function StoryMakerPage() {
    const { words } = useWordList();
    const router = useRouter();
    const [step, setStep] = useState<Step>("profile");
    const [profile, setProfile] = useState<UserProfile>({
        name: "",
        age: 6,
        gender: "boy",
    });
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [story, setStory] = useState<Story | null>(null);
    const [error, setError] = useState<string | null>(null);

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
            const service = getStoryService();
            const newStory = await service.generateStory(selectedWords, profile);
            setStory(newStory);
            setStep("reading");
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

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={!profile.name}
                                    className="primary-btn flex items-center gap-2 text-lg"
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
                    <div className="animate-slide-down">
                        <div className="card-frame rounded-card bg-white p-8 md:p-12 shadow-2xl relative overflow-hidden">
                            {/* Decorative background elements */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent via-cta to-accent"></div>
                            <Sparkles className="absolute top-8 right-8 h-12 w-12 text-accent/10" />

                            <h1 className="mb-8 text-center text-4xl font-black text-ink">{story.title}</h1>

                            <div className="prose prose-lg prose-p:text-xl prose-p:leading-relaxed mx-auto text-ink">
                                {/* Simple rendering of paragraphs. In a real app we might want to markdown parse or structure returns */}
                                {story.content.split('\n').map((paragraph, i) => (
                                    paragraph.trim() && <p key={i} className="mb-4">{paragraph}</p>
                                ))}
                            </div>

                            <div className="mt-12 flex flex-col items-center gap-6 border-t border-ink/5 pt-8">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {story.wordsUsed.map(word => (
                                        <span key={word} className="rounded-full bg-highlight px-3 py-1 text-sm font-bold text-ink">
                                            ★ {word}
                                        </span>
                                    ))}
                                </div>

                                <button
                                    onClick={reset}
                                    className="ghost-btn flex items-center gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" /> Make Another Story
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
