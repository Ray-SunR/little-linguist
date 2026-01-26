"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import confetti from "canvas-confetti";
import { safeHaptics, ImpactStyle } from "@/lib/core";
import { LibraryBookCard } from "@/lib/core/books/library-types";
import { Sparkles, Shield, Crown, Rocket, PawPrint, Microscope, Leaf } from "lucide-react";

export const HERO_MESSAGES = [
    "Hi! I'm Lumo! 👋",
    "I'm your reading buddy! 📚",
    "Let's learn new words! ✨",
    "You're doing great! 🌟",
    "Ready for an adventure? 🚀"
];

export const SPECIAL_MESSAGES = [
    "Wheeee! 🎉",
    "That tickles! 🤭",
    "Let's play! 🎈",
    "You found me! 🏆",
    "Yay! 🎊"
];

export const RECOMMENDATIONS = {
    "Space": [
        { title: "The Lonely Astronaut", cover: "/books/space1.webp", level: "PreK", color: "bg-blue-50" },
        { title: "Moon Jumpers", cover: "/books/space2.webp", level: "Kinder", color: "bg-indigo-50" },
        { title: "Rockets Away!", cover: "/books/space3.webp", level: "Grade 1", color: "bg-purple-50" },
    ],
    "Animals": [
        { title: "The Busy Beaver", cover: "/books/animal1.webp", level: "Kinder", color: "bg-green-50" },
        { title: "Lion's Proud Mane", cover: "/books/animal2.webp", level: "Grade 1", color: "bg-amber-50" },
        { title: "Deep Sea Friends", cover: "/books/animal3.webp", level: "PreK", color: "bg-cyan-50" },
    ],
    "Science": [
        { title: "Robot's First Gear", cover: "/books/science1.webp", level: "Grade 2", color: "bg-slate-50" },
        { title: "Dino Dig Discovery", cover: "/books/science2.webp", level: "Kinder", color: "bg-orange-50" },
        { title: "Plants are Magic", cover: "/books/science3.webp", level: "Grade 1", color: "bg-lime-50" },
    ],
};

export const INTERESTS = [
    { name: "Magic", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-50" },
    { name: "Superhero", icon: Shield, color: "text-red-500", bg: "bg-red-50" },
    { name: "Princess", icon: Crown, color: "text-pink-500", bg: "bg-pink-50" },
    { name: "Space", icon: Rocket, color: "text-blue-500", bg: "bg-blue-50" },
    { name: "Animals", icon: PawPrint, color: "text-green-500", bg: "bg-green-50" },
    { name: "Science", icon: Microscope, color: "text-purple-500", bg: "bg-purple-50" },
    { name: "Nature", icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-50" },
];

export interface Particle {
    top: string;
    left: string;
    scale: number;
    duration: number;
    delay: number;
    size: string;
}

export function useLandingPageViewModel() {
    const [messageIndex, setMessageIndex] = useState(0);
    const [isInteracting, setIsInteracting] = useState(false);
    const [messageList, setMessageList] = useState(HERO_MESSAGES);
    const [selectedInterest, setSelectedInterest] = useState("Magic");
    const [searchQuery, setSearchQuery] = useState("");
    const [books, setBooks] = useState<LibraryBookCard[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const lastRequestId = useRef(0);
    const [isNative, setIsNative] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    const fetchBooks = useCallback(async (query: string, signal?: AbortSignal) => {
        const requestId = ++lastRequestId.current;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}&limit=6`, { signal });
            if (res.ok) {
                const data = await res.json();

                // Only update if this is still the latest request
                if (requestId === lastRequestId.current) {
                    // Defensive mapping to ensure required fields and filter invalid ones
                    const safeBooks = (Array.isArray(data) ? data : [])
                        .filter((b: any) => b.id) // Filter out items with missing IDs
                        .map((b: any) => ({
                            id: b.id,
                            title: b.title || 'Untitled Story',
                            coverImageUrl: b.coverImageUrl,
                            coverPath: b.coverPath,
                            level: b.level || 'Explorer',
                            totalTokens: b.totalTokens || 0,
                            estimatedReadingTime: b.estimatedReadingTime || 1
                        }));
                    setBooks(safeBooks);
                    setHasSearched(true);
                }
            } else {
                throw new Error("Failed to fetch");
            }
        } catch (error: any) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error("Failed to fetch books:", error);
            if (requestId === lastRequestId.current) {
                setBooks([]);
                setHasSearched(true);
            }
        } finally {
            if (requestId === lastRequestId.current) {
                setIsLoading(false);
            }
        }
    }, []);

    // Initial load and debounced search
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetchBooks(searchQuery || selectedInterest, controller.signal);
        }, 500);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchQuery, selectedInterest, fetchBooks]);

    useEffect(() => {
        // Generate particles on client side only to avoid hydration mismatch
        const newParticles = Array.from({ length: 20 }).map(() => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            scale: Math.random() * 0.5 + 0.2,
            duration: Math.random() * 5 + 3,
            delay: Math.random() * 5,
            size: Math.random() * 10 + 'px'
        }));
        setParticles(newParticles);
    }, []);

    // Switch back to normal messages after interaction
    useEffect(() => {
        if (isInteracting) {
            const timeout = setTimeout(() => {
                setIsInteracting(false);
                setMessageList(HERO_MESSAGES);
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [isInteracting]);

    useEffect(() => {
        if (isInteracting) return; // Pause auto-cycle during interaction

        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messageList.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [isInteracting, messageList]);

    const handleLumoClick = (e: React.MouseEvent) => {
        // 1. Trigger Confetti
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        safeHaptics.impact({ style: ImpactStyle.Medium });

        confetti({
            origin: { x, y },
            particleCount: 100,
            spread: 70,
            colors: ['#FBBF24', '#818CF8', '#F472B6'] // Amber, Indigo, Pink
        });

        // 2. Play Bounce Animation & Message
        setIsInteracting(true);
        setMessageList(SPECIAL_MESSAGES);
        setMessageIndex(Math.floor(Math.random() * SPECIAL_MESSAGES.length));
    };

    return {
        messageIndex,
        isInteracting,
        messageList,
        selectedInterest,
        setSelectedInterest,
        searchQuery,
        setSearchQuery,
        books,
        isLoading,
        hasSearched,
        particles,
        isNative,
        hasMounted,
        handleLumoClick,
    };
}
