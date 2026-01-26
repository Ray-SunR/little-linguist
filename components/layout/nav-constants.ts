import { BookOpen, Wand2, Languages } from "lucide-react";

export const ME_PRIMARY_PATH = "/dashboard";
export const ME_PATHS = ["/dashboard", "/profiles"];

export const navItems = [
    {
        id: "nav-item-library",
        href: "/library",
        label: "Book Library",
        icon: BookOpen,
        color: "text-blue-500",
        shadow: "shadow-clay-purple", // Purple theme for library
        bg: "bg-blue-50 dark:bg-blue-900/20",
        activeBg: "bg-blue-100 dark:bg-blue-800/40",
    },
    {
        id: "nav-item-story",
        href: "/story-maker",
        label: "Story Maker",
        icon: Wand2,
        color: "text-purple-500",
        shadow: "shadow-clay-purple",
        bg: "bg-purple-50 dark:bg-purple-900/20",
        activeBg: "bg-purple-100 dark:bg-purple-800/40",
    },
    {
        id: "nav-item-words",
        href: "/my-words",
        label: "Word List",
        icon: Languages,
        color: "text-orange-500",
        shadow: "shadow-clay-orange",
        bg: "bg-orange-50 dark:bg-orange-900/20",
        activeBg: "bg-orange-100 dark:bg-orange-800/40",
    },
] as const;

export type NavItemConfig = Omit<typeof navItems[number], 'href'> & { href: string };
