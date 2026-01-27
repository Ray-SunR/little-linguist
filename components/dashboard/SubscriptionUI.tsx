"use client";

import { useUsage } from "@/lib/hooks/use-usage";
import { useEffect, useState } from "react";
import { getUsageHistory, UsageEvent } from "@/app/actions/usage";
import { Sparkles, Zap, Image as ImageIcon, BookOpen, Clock, ArrowUpRight, CheckCircle2, Search, X, Star } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { CachedImage } from "@/components/ui/cached-image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MagicSentenceModal } from "@/app/my-words/components/MagicSentenceModal";
import { useRouter } from "next/navigation";

export default function SubscriptionUI() {
    const router = useRouter();
    const { usage, plan, loading: usageLoading } = useUsage();
    const [history, setHistory] = useState<UsageEvent[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        getUsageHistory(20).then(data => {
            setHistory(data);
            setHistoryLoading(false);
        });
    }, []);

    const filteredHistory = history.filter(event =>
        event.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalResult, setModalResult] = useState<any>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const handleViewSentence = async (sentenceId: string) => {
        setIsModalOpen(true);
        setModalLoading(true);
        setModalError(null);
        setModalResult(null);

        try {
            const res = await fetch(`/api/words/magic-sentence/history?id=${sentenceId}`);
            if (!res.ok) throw new Error("Failed to fetch sentence details");
            const data = await res.json();
            setModalResult(data);
        } catch (err: any) {
            console.error(err);
            setModalError(err.message || "Something went wrong while fetching the magic!");
        } finally {
            setModalLoading(false);
        }
    };

    const handleRowClick = (event: UsageEvent) => {
        if (event.isDeleted) return;

        if (event.entityType === 'magic_sentence' && event.entityId) {
            handleViewSentence(event.entityId);
        } else if (event.entityType === 'story' && event.entityId) {
            router.push(`/reader/${event.entityId}`);
        } else if (event.bookId) {
            router.push(`/reader/${event.bookId}`);
        }
    };

    const isLoading = usageLoading || historyLoading;

    if (isLoading) {
        return (
            <div className="w-full max-w-4xl mx-auto p-6 animate-pulse space-y-8">
                <div className="h-48 bg-slate-200 rounded-3xl w-full" />
                <div className="h-64 bg-slate-200 rounded-3xl w-full" />
            </div>
        );
    }

    const isPro = plan === "pro" || plan === "premium";

    return (
        <main className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-32">
            {/* Sticky Dashboard Toolbar */}
            <div className="sticky top-4 z-50 mb-8">
                <div className="backdrop-blur-xl bg-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-white/80 ring-1 ring-slate-200/30 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 transition-all duration-500">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200/50">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black font-fredoka text-ink leading-none mb-1">Subscription & Usage</h1>
                            <p className="text-[10px] font-bold font-nunito text-slate-400 uppercase tracking-widest leading-none">Manage your magic</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Input - Desktop */}
                        <div className="hidden md:flex items-center bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-purple-100 transition-all w-64">
                            <Search className="w-4 h-4 text-slate-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search activity..."
                                className="bg-transparent border-none outline-none font-nunito font-bold text-sm text-ink placeholder:text-slate-400 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="p-0.5 hover:bg-slate-200 rounded-full">
                                    <X className="w-3 h-3 text-slate-400" />
                                </button>
                            )}
                        </div>

                        {!isPro && (
                            <Link href="/upgrade" className="clay-btn-primary px-5 py-2 rounded-xl flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-200" />
                                <span className="font-fredoka font-bold text-white text-xs uppercase tracking-wide">Upgrade</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Search - Only visible on small screens */}
            <div className="md:hidden flex items-center bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm mb-4">
                <Search className="w-4 h-4 text-slate-400 mr-3" />
                <input
                    type="text"
                    placeholder="Search activity..."
                    className="bg-transparent border-none outline-none font-nunito font-bold text-sm text-ink placeholder:text-slate-400 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Plan Status Card - More compact */}
            <section className="clay-card p-6 rounded-[2rem] bg-gradient-to-br from-white to-slate-50 relative overflow-hidden ring-1 ring-slate-100">
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-30 pointer-events-none" />

                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-black font-fredoka text-slate-400 uppercase tracking-widest">Current Plan</span>
                            {isPro && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase">Active</span>}
                        </div>
                        <h2 className="text-3xl font-black font-fredoka text-purple-600 mb-3 capitalize">
                            {plan} Explorer
                        </h2>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2 text-slate-600 font-nunito font-bold text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{isPro ? "Unlimited Story Generation" : "3 Stories / Month"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 font-nunito font-bold text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{isPro ? "Priority Support" : "Standard Support"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-auto md:min-w-[280px] bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-100 flex flex-col justify-center shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold font-nunito text-slate-500">Next Billing</span>
                            <span className="text-ink font-black font-fredoka text-sm">Feb 13, 2026</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                            <span className="text-xs font-bold font-nunito text-slate-500">Amount</span>
                            <span className="text-ink font-black font-fredoka text-xl">{isPro ? "$9.99" : "$0.00"}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Usage Quotas */}
            <section>
                <h3 className="text-xl font-black font-fredoka text-ink mb-6 px-2">Monthly Usage</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Story Gen */}
                    <UsageCard
                        icon={<BookOpen className="w-6 h-6 text-pink-500" />}
                        label="Story Generation"
                        current={usage.story_generation?.current || 0}
                        limit={usage.story_generation?.limit || 0}
                        color="bg-pink-500"
                        bg="bg-pink-100"
                    />
                    {/* Image Gen */}
                    <UsageCard
                        icon={<ImageIcon className="w-6 h-6 text-blue-500" />}
                        label="Image Generation"
                        current={usage.image_generation?.current || 0}
                        limit={usage.image_generation?.limit || 0}
                        color="bg-blue-500"
                        bg="bg-blue-100"
                    />
                    {/* Word Insight */}
                    <UsageCard
                        icon={<Zap className="w-6 h-6 text-amber-500" />}
                        label="Word Insights"
                        current={usage.word_insight?.current || 0}
                        limit={usage.word_insight?.limit || 0}
                        color="bg-amber-500"
                        bg="bg-amber-100"
                    />
                    {/* Magic Sentence */}
                    <UsageCard
                        icon={<Sparkles className="w-6 h-6 text-purple-500" />}
                        label="Magic Sentences"
                        current={usage.magic_sentence?.current || 0}
                        limit={usage.magic_sentence?.limit || 0}
                        color="bg-purple-500"
                        bg="bg-purple-100"
                    />
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-lg font-black font-fredoka text-ink">Recent Activity</h3>
                    <Link href="/dashboard/usage" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-ink transition-all group" aria-label="View all activity history">
                        <span className="text-[10px] font-black font-fredoka uppercase tracking-wider">View All</span>
                        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                </div>

                <div className="clay-card bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100 shadow-sm">
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/50 backdrop-blur-sm border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Activity Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Profile</th>
                                    <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                                    <th className="px-6 py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Usage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-nunito font-bold">
                                            {searchQuery ? "No matching activity found." : "No activity found yet. Start your journey!"}
                                        </td>
                                    </tr>
                                )}
                                {filteredHistory.map((event) => {
                                    const isClickable = !!(event.entityId || event.bookId) && !event.isDeleted;
                                    return (
                                        <tr
                                            key={event.id}
                                            className={cn(
                                                "transition-colors border-b border-slate-50 last:border-0",
                                                isClickable ? "cursor-pointer hover:bg-slate-50" : "",
                                                event.isDeleted ? "opacity-70" : ""
                                            )}
                                            onClick={() => isClickable && handleRowClick(event)}
                                        >
                                            <td className="px-6 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm",
                                                        event.coverImageUrl 
                                                            ? "bg-slate-100" 
                                                            : (event.currencyType === 'lumo_coin' 
                                                                ? 'bg-amber-50 text-amber-600' 
                                                                : 'bg-emerald-50 text-emerald-600')
                                                    )}>
                                                        {event.coverImageUrl ? (
                                                            <CachedImage src={event.coverImageUrl} storagePath={event.storagePath} updatedAt={event.updatedAt} alt={event.description} width={40} height={40} className="w-full h-full object-cover" bucket={(event.bucket as any) || "book-assets"} />
                                                        ) : (
                                                            event.currencyType === 'lumo_coin' ? <Star className="w-4 h-4 fill-current" /> :
                                                                (event.action.toLowerCase().includes('insight') ? <Zap className="w-4 h-4" /> :
                                                                    event.action.toLowerCase().includes('magic') ? <Sparkles className="w-4 h-4" /> :
                                                                        event.action.toLowerCase().includes('story') ? <BookOpen className="w-4 h-4" /> :
                                                                            <ArrowUpRight className="w-4 h-4" />)
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        {event.bookId ? (
                                                            <>
                                                                <Link
                                                                    href={event.isDeleted ? "#" : `/reader/${event.bookId}`}
                                                                    onClick={(e) => event.isDeleted && e.preventDefault()}
                                                                    className={cn(
                                                                        "font-bold font-nunito text-ink text-sm truncate block leading-tight",
                                                                        event.isDeleted ? "cursor-default" : "hover:text-purple-600 hover:underline"
                                                                    )}
                                                                >
                                                                    {event.description} {event.isDeleted && <span className="text-slate-400 font-normal opacity-70">(Deleted)</span>}
                                                                </Link>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight leading-tight">{event.action}</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="font-bold font-nunito text-ink text-sm truncate leading-tight">
                                                                    {event.action} {event.isDeleted && <span className="text-slate-400 font-normal opacity-70 ml-1">(Deleted)</span>}
                                                                </p>
                                                                <p className="text-[10px] font-semibold text-slate-400 line-clamp-1 leading-tight">{event.description}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2.5">
                                                {event.childId ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                                                            {event.childAvatar ? (
                                                                <CachedImage src={event.childAvatar} alt={event.childName || 'Child'} width={24} height={24} className="w-full h-full object-cover" bucket="user-assets" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-400">
                                                                    <Star className="w-3 h-3 fill-current" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">
                                                            {event.childName}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 italic">System</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-2.5">
                                                <p className="text-[10px] font-bold text-slate-500 font-nunito leading-tight" suppressHydrationWarning>
                                                    {new Date(event.timestamp).toLocaleString(undefined, {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-2.5 text-right">
                                                <AmountDisplay event={event} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View: Card List */}
                    <ul className="md:hidden divide-y divide-slate-100 p-0 m-0 list-none">
                        {filteredHistory.length === 0 && (
                            <li className="px-6 py-12 text-center text-slate-400 font-nunito font-bold">
                                {searchQuery ? "No matching activity found." : "No activity found yet. Start your journey!"}
                            </li>
                        )}
                        {filteredHistory.map((event) => {
                            const isClickable = !!(event.entityId || event.bookId) && !event.isDeleted;
                            return (
                                <li
                                    key={event.id}
                                    className={cn(
                                        "p-4 flex flex-col gap-3 transition-colors",
                                        isClickable ? "cursor-pointer hover:bg-slate-50 active:bg-slate-100" : "",
                                        event.isDeleted ? "opacity-70" : ""
                                    )}
                                    aria-label={`Activity: ${event.action || event.description}${event.isDeleted ? ' (Deleted)' : ''}`}
                                    onClick={() => isClickable && handleRowClick(event)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm",
                                            event.coverImageUrl 
                                                ? "bg-slate-100" 
                                                : (event.currencyType === 'lumo_coin' 
                                                    ? 'bg-amber-50 text-amber-600' 
                                                    : 'bg-emerald-50 text-emerald-600')
                                        )}>
                                            {event.coverImageUrl ? (
                                                <CachedImage src={event.coverImageUrl} storagePath={event.storagePath} updatedAt={event.updatedAt} alt={event.description} width={48} height={48} className="w-full h-full object-cover" bucket={(event.bucket as any) || "book-assets"} />
                                            ) : (
                                                event.currencyType === 'lumo_coin' ? <Star className="w-5 h-5 fill-current" /> :
                                                    (event.action.toLowerCase().includes('insight') ? <Zap className="w-5 h-5" /> :
                                                        event.action.toLowerCase().includes('magic') ? <Sparkles className="w-5 h-5" /> :
                                                            event.action.toLowerCase().includes('story') ? <BookOpen className="w-5 h-5" /> :
                                                                <ArrowUpRight className="w-5 h-5" />)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {event.bookId ? (
                                                <>
                                                    <Link
                                                        href={event.isDeleted ? "#" : `/reader/${event.bookId}`}
                                                        onClick={(e) => event.isDeleted && e.preventDefault()}
                                                        className={cn(
                                                            "font-bold font-nunito text-ink text-sm line-clamp-1",
                                                            event.isDeleted ? "cursor-default" : "hover:text-purple-600 active:text-purple-700"
                                                        )}
                                                    >
                                                        {event.description} {event.isDeleted && <span className="text-slate-400 font-normal opacity-70">(Deleted)</span>}
                                                    </Link>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{event.action}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-bold font-nunito text-ink text-sm line-clamp-1">
                                                        {event.action} {event.isDeleted && <span className="text-slate-400 font-normal opacity-70 ml-1">(Deleted)</span>}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <p className="text-[10px] font-semibold text-slate-400 line-clamp-2">{event.description}</p>
                                                        {event.childName && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-[10px] font-bold text-purple-500/70">{event.childName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <AmountDisplay event={event} mobile />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-50 pt-1.5 mt-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 font-nunito" suppressHydrationWarning>
                                            {new Date(event.timestamp).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                        {!event.isDeleted && (
                                            <button
                                                className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRowClick(event);
                                                }}
                                            >
                                                Details <ArrowUpRight className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </section>

            <MagicSentenceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isLoading={modalLoading}
                result={modalResult}
                error={modalError}
            />
        </main>
    );
}

function AmountDisplay({ event, mobile = false }: { event: UsageEvent, mobile?: boolean }) {
    // Determine individual label for non-grouped transactions
    let individualLabel = event.currencyType === 'lumo_coin' ? "COINS" : "CREDITS";
    
    if (!event.isGrouped) {
        const actionLower = event.action.toLowerCase();
        if (actionLower.includes("word insight")) {
            individualLabel = "INSIGHT";
        } else if (actionLower.includes("story generation")) {
            individualLabel = "STORY";
        } else if (actionLower.includes("image generation")) {
            individualLabel = "IMAGE";
        } else if (actionLower.includes("magic sentence")) {
            individualLabel = "MAGIC";
        }
    }

    const isPositive = event.type === 'credit';

    return (
        <div className="flex flex-col items-end gap-1">
            {event.isGrouped ? (
                <div className={`flex ${mobile ? 'flex-row gap-3' : 'flex-col items-end gap-1'}`}>
                    {event.storyAmount !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                                {event.entityType === 'magic_sentence' ? 'Magic' : 'Story'}
                            </span>
                            <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black font-fredoka border",
                                event.storyAmount < 0
                                    ? "bg-red-50 text-red-600 border-red-100"
                                    : (event.storyAmount > 0
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : "bg-slate-50 text-slate-500 border-slate-100")
                            )}>
                                {event.storyAmount < 0 ? '-' : (event.storyAmount > 0 ? '+' : '')}{Math.abs(event.storyAmount)}
                            </span>
                        </div>
                    )}
                    {event.imageAmount !== undefined && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Image</span>
                            <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black font-fredoka border",
                                event.imageAmount < 0
                                    ? "bg-red-50 text-red-600 border-red-100"
                                    : (event.imageAmount > 0
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : "bg-slate-50 text-slate-500 border-slate-100")
                            )}>
                                {event.imageAmount < 0 ? '-' : (event.imageAmount > 0 ? '+' : '')}{Math.abs(event.imageAmount)}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-1.5">
                    {individualLabel && (
                        <span className="text-[10px] font-black text-slate-400 uppercase">
                            {individualLabel}
                        </span>
                    )}
                    <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black font-fredoka border",
                        event.currencyType === 'lumo_coin'
                            ? (isPositive ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100')
                            : (isPositive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100')
                    )}>
                        {isPositive ? '+' : '-'}{event.amount}
                    </span>
                </div>
            )}
        </div>
    );
}

function UsageCard({ icon, label, current, limit, color, bg }: {
    icon: React.ReactNode,
    label: string,
    current: number,
    limit: number,
    color: string,
    bg: string
}) {
    const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;

    return (
        <div className="clay-card p-6 rounded-3xl bg-white flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div>
                <h4 className="font-black font-fredoka text-ink mb-1">{label}</h4>
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold font-nunito text-slate-400 uppercase">Usage</span>
                    <span className="text-sm font-black font-nunito text-slate-600">{current} / {limit === 0 ? "∞" : limit}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full rounded-full ${color}`}
                    />
                </div>
            </div>
        </div>
    );
}
