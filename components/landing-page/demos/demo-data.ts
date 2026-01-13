"use client";

/**
 * Demo data for the landing page interactive reader demo.
 * Uses content from "Steve's Blocky Building Adventure" (192abf4e-7d66-4e59-8236-b6a9b2b65ab9)
 */

// Book ID for asset loading
export const DEMO_BOOK_ID = "192abf4e-7d66-4e59-8236-b6a9b2b65ab9";

// Demo text tokens (from the actual book)
export const DEMO_TOKENS = [
    { i: 0, t: "Blocky", type: "w" },
    { t: " ", type: "s" },
    { i: 1, t: "world", type: "w" },
    { t: ",", type: "p" },
    { t: " ", type: "s" },
    { i: 2, t: "so", type: "w" },
    { t: " ", type: "s" },
    { i: 3, t: "bright", type: "w" },
    { t: " ", type: "s" },
    { i: 4, t: "and", type: "w" },
    { t: " ", type: "s" },
    { i: 5, t: "new", type: "w" },
    { t: ".", type: "p" },
    { t: "\n", type: "s" },
    { i: 6, t: "Square", type: "w" },
    { t: " ", type: "s" },
    { i: 7, t: "sun", type: "w" },
    { t: " ", type: "s" },
    { i: 8, t: "shines", type: "w" },
    { t: ",", type: "p" },
    { t: " ", type: "s" },
    { i: 9, t: "sky", type: "w" },
    { t: " ", type: "s" },
    { i: 10, t: "so", type: "w" },
    { t: " ", type: "s" },
    { i: 11, t: "blue", type: "w" },
    { t: ".", type: "p" },
    { t: "\n", type: "s" },
    { i: 12, t: "Green", type: "w" },
    { t: " ", type: "s" },
    { i: 13, t: "blocks", type: "w" },
    { t: " ", type: "s" },
    { i: 14, t: "here", type: "w" },
    { t: ",", type: "p" },
    { t: " ", type: "s" },
    { i: 15, t: "brown", type: "w" },
    { t: " ", type: "s" },
    { i: 16, t: "blocks", type: "w" },
    { t: " ", type: "s" },
    { i: 17, t: "there", type: "w" },
    { t: ".", type: "p" },
    { t: "\n", type: "s" },
    { i: 18, t: "Little", type: "w" },
    { t: " ", type: "s" },
    { i: 19, t: "Steve", type: "w" },
    { t: " ", type: "s" },
    { i: 20, t: "builds", type: "w" },
    { t: " ", type: "s" },
    { i: 21, t: "with", type: "w" },
    { t: " ", type: "s" },
    { i: 22, t: "care", type: "w" },
    { t: ".", type: "p" },
    { t: "\n", type: "s" },
    { i: 23, t: "He", type: "w" },
    { t: " ", type: "s" },
    { i: 24, t: "stacks", type: "w" },
    { t: " ", type: "s" },
    { i: 25, t: "the", type: "w" },
    { t: " ", type: "s" },
    { i: 26, t: "blocks", type: "w" },
    { t: " ", type: "s" },
    { i: 27, t: "up", type: "w" },
    { t: " ", type: "s" },
    { i: 28, t: "high", type: "w" },
    { t: " ", type: "s" },
    { i: 29, t: "and", type: "w" },
    { t: " ", type: "s" },
    { i: 30, t: "tall", type: "w" },
    { t: ".", type: "p" },
    { t: "\n", type: "s" },
    { i: 31, t: "His", type: "w" },
    { t: " ", type: "s" },
    { i: 32, t: "house", type: "w" },
    { t: " ", type: "s" },
    { i: 33, t: "grows", type: "w" },
    { t: " ", type: "s" },
    { i: 34, t: "big", type: "w" },
    { t: ",", type: "p" },
    { t: " ", type: "s" },
    { i: 35, t: "it", type: "w" },
    { t: " ", type: "s" },
    { i: 36, t: "will", type: "w" },
    { t: " ", type: "s" },
    { i: 37, t: "not", type: "w" },
    { t: " ", type: "s" },
    { i: 38, t: "fall", type: "w" },
    { t: ".", type: "p" },
] as const;

// Word timing data (from the actual book's speech marks)
export const DEMO_WORD_TIMINGS = [
    { word: "Blocky", start: 0, end: 462 },
    { word: "world", start: 462, end: 837 },
    { word: "so", start: 1087, end: 1275 },
    { word: "bright", start: 1275, end: 1725 },
    { word: "and", start: 1725, end: 1862 },
    { word: "new", start: 1862, end: 2462 },
    { word: "Square", start: 2887, end: 3337 },
    { word: "sun", start: 3337, end: 3775 },
    { word: "shines", start: 3775, end: 4200 },
    { word: "sky", start: 4462, end: 4787 },
    { word: "so", start: 4787, end: 5025 },
    { word: "blue", start: 5025, end: 5712 },
    { word: "Green", start: 6025, end: 6437 },
    { word: "blocks", start: 6437, end: 6937 },
    { word: "here", start: 6937, end: 7350 },
    { word: "brown", start: 7575, end: 7912 },
    { word: "blocks", start: 7912, end: 8412 },
    { word: "there", start: 8412, end: 9012 },
    { word: "Little", start: 9337, end: 9712 },
    { word: "Steve", start: 9712, end: 10275 },
    { word: "builds", start: 10275, end: 10712 },
    { word: "with", start: 10712, end: 10900 },
    { word: "care", start: 10900, end: 11562 },
    { word: "He", start: 11875, end: 12087 },
    { word: "stacks", start: 12087, end: 12600 },
    { word: "the", start: 12600, end: 12775 },
    { word: "blocks", start: 12775, end: 13225 },
    { word: "up", start: 13225, end: 13462 },
    { word: "high", start: 13462, end: 13825 },
    { word: "and", start: 13825, end: 14025 },
    { word: "tall", start: 14025, end: 14687 },
    { word: "His", start: 15012, end: 15250 },
    { word: "house", start: 15250, end: 15587 },
    { word: "grows", start: 15587, end: 16025 },
    { word: "big", start: 16025, end: 16537 },
    { word: "it", start: 16775, end: 16950 },
    { word: "will", start: 16950, end: 17150 },
    { word: "not", start: 17150, end: 17400 },
    { word: "fall", start: 17400, end: 18000 },
];

// Mock word insights (pre-generated for demo)
export const DEMO_WORD_INSIGHTS: Record<string, {
    word: string;
    definition: string;
    example: string;
    emoji: string;
}> = {
    blocky: {
        word: "Blocky",
        definition: "Made of blocks or having a square shape",
        example: "The blocky tower was made of colorful cubes.",
        emoji: "🧱",
    },
    square: {
        word: "Square",
        definition: "A shape with four equal sides and four corners",
        example: "The window was a perfect square.",
        emoji: "⬜",
    },
    stacks: {
        word: "Stacks",
        definition: "To pile things on top of each other",
        example: "She stacks her books neatly on the shelf.",
        emoji: "📚",
    },
    tall: {
        word: "Tall",
        definition: "Having a great height; not short",
        example: "The giraffe is a very tall animal.",
        emoji: "📏",
    },
    bright: {
        word: "Bright",
        definition: "Full of light; shining strongly",
        example: "The sun was so bright that I needed sunglasses.",
        emoji: "☀️",
    },
    shines: {
        word: "Shines",
        definition: "Gives off light; glows",
        example: "The moon shines at night.",
        emoji: "✨",
    },
    builds: {
        word: "Builds",
        definition: "To make something by putting parts together",
        example: "The worker builds houses for people to live in.",
        emoji: "🏗️",
    },
    grows: {
        word: "Grows",
        definition: "Gets bigger over time",
        example: "The plant grows taller every day.",
        emoji: "🌱",
    },
};

// Words that should be highlighted as "magic words" (tappable)
export const MAGIC_WORD_INDICES = new Set([0, 6, 24, 30, 3, 8, 20, 33]);

// Cover image path
export const DEMO_COVER_PATH = `${DEMO_BOOK_ID}/cover.webp`;

// --- STORY MAKER DEMO DATA ---

export interface StoryTheme {
    id: string;
    label: string;
    icon: string;
    image: string;
    preview: string;
}

export const STORY_DEMO_THEMES: StoryTheme[] = [
    {
        id: "space",
        label: "Space Adventure",
        icon: "🚀",
        image: "/landing-page/demo-space.png",
        preview: "{heroName} floated through the starry sky, past colorful planets and twinkling constellations. A friendly robot waved from a nearby asteroid...",
    },
    {
        id: "ocean",
        label: "Ocean Quest",
        icon: "🌊",
        image: "/landing-page/demo-ocean.png",
        preview: "{heroName} dove into the crystal blue water, where a gentle sea turtle offered to be their guide through the coral kingdom...",
    },
    {
        id: "forest",
        label: "Magic Forest",
        icon: "🌲",
        image: "/landing-page/demo-forest.png",
        preview: "{heroName} stepped into the Whispering Woods, where glowing mushrooms lit the path and friendly creatures watched from the shadows...",
    },
];
