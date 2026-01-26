import {
    LayoutGrid,
    Cloud,
    Sparkles,
    Wand2,
    Heart,
    Scroll,
    Gamepad2,
    Eye,
    Crown,
    Leaf,
    FlaskConical,
    Snowflake,
    Rocket,
    Trophy,
    Zap,
    Car,
    BookOpen,
    LucideIcon
} from "lucide-react";

export interface Category {
    id: string;
    label: string;
    icon: LucideIcon;
    iconClass: string;
}

export const CATEGORIES: Category[] = [
    { id: "all", label: "All Stories", icon: LayoutGrid, iconClass: "text-purple-600 fill-purple-100" },
    { id: "animals", label: "Animals", icon: Cloud, iconClass: "text-orange-500 fill-orange-100" },
    { id: "dinosaurs", label: "Dinosaurs", icon: Sparkles, iconClass: "text-emerald-600 fill-emerald-100" },
    { id: "fantasy", label: "Fantasy", icon: Wand2, iconClass: "text-purple-500 fill-purple-100" },
    { id: "friendship", label: "Friendship", icon: Heart, iconClass: "text-pink-500 fill-pink-100" },
    { id: "history", label: "History", icon: Scroll, iconClass: "text-yellow-600 fill-yellow-100" },
    { id: "minecraft", label: "Minecraft", icon: Gamepad2, iconClass: "text-green-600/90 fill-green-100" },
    { id: "mystery", label: "Mystery", icon: Eye, iconClass: "text-indigo-600 fill-indigo-100" },
    { id: "mythology", label: "Mythology", icon: Crown, iconClass: "text-amber-600 fill-amber-100" },
    { id: "nature", label: "Nature", icon: Leaf, iconClass: "text-green-500 fill-green-100" },
    { id: "science", label: "Science", icon: FlaskConical, iconClass: "text-blue-500 fill-blue-100" },
    { id: "seasonal", label: "Seasonal", icon: Snowflake, iconClass: "text-sky-400 fill-sky-100" },
    { id: "space", label: "Space", icon: Rocket, iconClass: "text-indigo-500 fill-indigo-100" },
    { id: "sports", label: "Sports", icon: Trophy, iconClass: "text-orange-500 fill-orange-100" },
    { id: "superheroes", label: "Superheroes", icon: Zap, iconClass: "text-yellow-500 fill-yellow-100" },
    { id: "vehicles", label: "Vehicles", icon: Car, iconClass: "text-red-500 fill-red-100" },
];

export const COLLECTIONS = [
    {
        id: "discovery",
        label: "Discovery",
        icon: Sparkles,
        theme: "from-purple-500 to-blue-500",
        bg: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-100"
    },
    {
        id: "browse",
        label: "Browse All",
        icon: BookOpen,
        theme: "from-blue-500 to-indigo-500",
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-100"
    },
    {
        id: "my-tales",
        label: "My Tales",
        icon: Wand2,
        theme: "from-rose-400 to-purple-500",
        bg: "bg-rose-50",
        text: "text-rose-600",
        border: "border-rose-100"
    },
    {
        id: "favorites",
        label: "Favorites",
        icon: Heart,
        theme: "from-amber-400 to-rose-500",
        bg: "bg-amber-50",
        text: "text-amber-600",
        border: "border-amber-100"
    },
] as const;

export const COLLECTION_THEMES = {
    discovery: "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-indigo-200/50",
    browse: "bg-gradient-to-r from-blue-500 to-indigo-500",
    "my-tales": "bg-gradient-to-r from-rose-400 to-purple-500",
    favorites: "bg-gradient-to-r from-amber-400 to-pink-500"
};
