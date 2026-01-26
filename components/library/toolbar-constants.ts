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
    LucideIcon,
    Baby,
    Palette,
    Microscope,
    Clock,
    Play,
    Flame
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

export const LEVEL_OPTIONS = [
    {
        value: "toddler",
        label: "Toddler",
        icon: Baby,
        theme: "bg-rose-500 text-white shadow-rose-200",
        iconColor: "text-rose-500",
        hoverRx: "hover:bg-rose-50 group-hover:text-rose-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-rose-400 text-rose-600 shadow-lg shadow-rose-100",
        activeIconClass: "text-rose-500"
    },
    {
        value: "preschool",
        label: "Preschool",
        icon: Palette,
        theme: "bg-amber-500 text-white shadow-amber-200",
        iconColor: "text-amber-500",
        hoverRx: "hover:bg-amber-50 group-hover:text-amber-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-amber-400 text-amber-600 shadow-lg shadow-amber-100",
        activeIconClass: "text-amber-500"
    },
    {
        value: "elementary",
        label: "Elementary",
        icon: Rocket,
        theme: "bg-indigo-500 text-white shadow-indigo-200",
        iconColor: "text-indigo-500",
        hoverRx: "hover:bg-indigo-50 group-hover:text-indigo-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-indigo-400 text-indigo-600 shadow-lg shadow-indigo-100",
        activeIconClass: "text-indigo-500"
    },
    {
        value: "intermediate",
        label: "Intermediate",
        icon: FlaskConical,
        theme: "bg-violet-600 text-white shadow-violet-200",
        iconColor: "text-violet-500",
        hoverRx: "hover:bg-violet-50 group-hover:text-violet-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-violet-400 text-violet-600 shadow-lg shadow-violet-100",
        activeIconClass: "text-violet-500"
    },
];

export const TYPE_OPTIONS = [
    {
        value: "fiction",
        label: "Stories",
        icon: Wand2,
        theme: "bg-purple-500 text-white shadow-purple-200",
        iconColor: "text-purple-500",
        hoverRx: "hover:bg-purple-50 group-hover:text-purple-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-purple-400 text-purple-600 shadow-lg shadow-purple-100",
        activeIconClass: "text-purple-500"
    },
    {
        value: "nonfiction",
        label: "Facts",
        icon: Microscope,
        theme: "bg-blue-500 text-white shadow-blue-200",
        iconColor: "text-blue-500",
        hoverRx: "hover:bg-blue-50 group-hover:text-blue-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-blue-400 text-blue-600 shadow-lg shadow-blue-100",
        activeIconClass: "text-blue-500"
    },
];

export const DURATION_OPTIONS = [
    {
        value: "short",
        label: "< 5m",
        icon: Zap,
        theme: "bg-teal-500 text-white shadow-teal-200",
        iconColor: "text-teal-500",
        hoverRx: "hover:bg-teal-50 group-hover:text-teal-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-teal-400 text-teal-600 shadow-lg shadow-teal-100",
        activeIconClass: "text-teal-500"
    },
    {
        value: "medium",
        label: "5-10m",
        icon: Play,
        theme: "bg-sky-500 text-white shadow-sky-200",
        iconColor: "text-sky-500",
        hoverRx: "hover:bg-sky-50 group-hover:text-sky-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-sky-400 text-sky-600 shadow-lg shadow-sky-100",
        activeIconClass: "text-sky-500"
    },
    {
        value: "long",
        label: "> 10m",
        icon: Flame,
        theme: "bg-orange-500 text-white shadow-orange-200",
        iconColor: "text-orange-500",
        hoverRx: "hover:bg-orange-50 group-hover:text-orange-500",
        activeIconColor: "text-white",
        activeClass: "bg-white border-orange-400 text-orange-600 shadow-lg shadow-orange-100",
        activeIconClass: "text-orange-500"
    },
];

