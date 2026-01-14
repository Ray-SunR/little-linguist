"use client";

import { useUsage } from "@/lib/hooks/use-usage";
import { useEffect, useState } from "react";
import { getUsageHistory, UsageEvent } from "@/app/actions/usage";
import { Sparkles, Zap, Image as ImageIcon, BookOpen, Clock, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { CachedImage } from "@/components/ui/cached-image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SubscriptionUI() {
    const { usage, plan, loading: usageLoading } = useUsage();
    const [history, setHistory] = useState<UsageEvent[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        getUsageHistory(10).then(data => {
            setHistory(data);
            setHistoryLoading(false);
        });
    }, []);

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
        <main className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black font-fredoka text-ink">Subscription & Usage</h1>
                    <p className="text-slate-500 font-nunito font-bold">Manage your plan and track your magical resources</p>
                </div>
                {!isPro && (
                    <Link href="/upgrade" className="clay-btn-primary px-6 py-3 rounded-2xl flex items-center gap-2 self-start md:self-auto">
                        <Sparkles className="w-5 h-5 text-amber-200" />
                        <span className="font-fredoka font-bold text-white uppercase tracking-wide">Upgrade Plan</span>
                    </Link>
                )}
            </div>

            {/* Plan Status Card */}
            <section className="clay-card p-8 rounded-[2.5rem] bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />

                <div className="flex flex-col md:flex-row gap-8 relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-black font-fredoka text-slate-400 uppercase tracking-widest">Current Plan</span>
                            {isPro && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase">Active</span>}
                        </div>
                        <h2 className="text-4xl font-black font-fredoka text-purple-600 mb-4 capitalize">
                            {plan} Explorer
                        </h2>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-slate-600 font-nunito font-bold text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span>{isPro ? "Unlimited Story Generation" : "3 Stories / Month"}</span>
                            </li>
                            <li className="flex items-center gap-2 text-slate-600 font-nunito font-bold text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span>{isPro ? "Priority Support" : "Standard Support"}</span>
                            </li>
                        </ul>
                    </div>

                    <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold font-nunito text-slate-500">Next Billing Date</span>
                            <span className="text-ink font-black font-fredoka text-lg">Feb 13, 2026</span>
                        </div>
                        <div className="flex justify-between items-end border-t border-slate-100 pt-4 mt-2">
                            <span className="text-sm font-bold font-nunito text-slate-500">Amount</span>
                            <span className="text-ink font-black font-fredoka text-2xl">{isPro ? "$9.99" : "$0.00"}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Usage Quotas */}
            <section>
                <h3 className="text-xl font-black font-fredoka text-ink mb-6 px-2">Monthly Usage</h3>
                <div className="grid md:grid-cols-3 gap-6">
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
                </div>
            </section>

            {/* History Log */}
            <section>
                <div className="flex items-center justify-between mb-6 px-2">
                    <h3 className="text-xl font-black font-fredoka text-ink">Recent Activity</h3>
                    <Link href="/dashboard/usage" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-ink transition-all group" aria-label="View all activity history">
                        <span className="text-[11px] font-black font-fredoka uppercase tracking-wider">View All</span>
                        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                </div>

                <div className="clay-card bg-white rounded-3xl overflow-hidden">
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black font-fredoka text-slate-400 uppercase tracking-widest">Activity</th>
                                    <th className="px-6 py-4 text-left text-xs font-black font-fredoka text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-black font-fredoka text-slate-400 uppercase tracking-widest">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.length === 0 && !historyLoading && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-nunito font-bold">
                                            No activity found yet. Start your journey!
                                        </td>
                                    </tr>
                                )}
                                {history.map((event) => (
                                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${event.coverImageUrl ? "bg-slate-100" : (event.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')}`}>
                                                    {event.coverImageUrl ? (
                                                        <CachedImage src={event.coverImageUrl} storagePath={event.storagePath} updatedAt={event.updatedAt} alt={event.description} width={48} height={48} className="w-full h-full object-cover" bucket="book-assets" />
                                                    ) : (
                                                        event.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <Clock className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {event.bookId ? (
                                                        <>
                                                            <Link href={`/reader/${event.bookId}`} className="font-bold font-nunito text-ink text-sm truncate hover:text-purple-600 hover:underline block">
                                                                {event.description}
                                                            </Link>
                                                            <p className="text-xs font-semibold text-slate-400 line-clamp-1">{event.action}</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="font-bold font-nunito text-ink text-sm truncate">{event.action}</p>
                                                            <p className="text-xs font-semibold text-slate-400 line-clamp-1">{event.description}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[11px] font-bold text-slate-500 font-nunito leading-tight" suppressHydrationWarning>
                                                {new Date(event.timestamp).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                                })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <AmountDisplay event={event} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View: Card List */}
                    <ul className="md:hidden divide-y divide-slate-100 p-0 m-0 list-none">
                        {history.length === 0 && !historyLoading && (
                            <li className="px-6 py-12 text-center text-slate-400 font-nunito font-bold">
                                No activity found yet. Start your journey!
                            </li>
                        )}
                        {history.map((event) => (
                            <li key={event.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors" aria-label={`Activity: ${event.action || event.description}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${event.coverImageUrl ? "bg-slate-100 shadow-sm" : (event.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')}`}>
                                        {event.coverImageUrl ? (
                                            <CachedImage src={event.coverImageUrl} storagePath={event.storagePath} updatedAt={event.updatedAt} alt={event.description} width={56} height={56} className="w-full h-full object-cover" bucket="book-assets" />
                                        ) : (
                                            event.type === 'credit' ? <ArrowUpRight className="w-6 h-6" /> : <Clock className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 py-0.5">
                                        {event.bookId ? (
                                            <>
                                                <Link href={`/reader/${event.bookId}`} className="font-bold font-nunito text-ink text-base line-clamp-1 hover:text-purple-600 active:text-purple-700">
                                                    {event.description}
                                                </Link>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mt-0.5">{event.action}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-bold font-nunito text-ink text-base line-clamp-1">{event.action}</p>
                                                <p className="text-xs font-semibold text-slate-400 line-clamp-2 mt-0.5">{event.description}</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-1">
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date & Time</p>
                                        <p className="text-[11px] font-bold text-slate-500 font-nunito leading-none" suppressHydrationWarning>
                                            {new Date(event.timestamp).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                            })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <AmountDisplay event={event} mobile />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </main>
    );
}

function AmountDisplay({ event, mobile = false }: { event: UsageEvent, mobile?: boolean }) {
    return (
        <div className="flex flex-col items-end gap-1">
            {event.isGrouped ? (
                <div className={`flex ${mobile ? 'flex-row gap-3' : 'flex-col items-end gap-1'}`}>
                    {event.storyAmount !== undefined && event.storyAmount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Story</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black font-fredoka bg-red-50 text-red-600 border border-red-100">
                                -{event.storyAmount}
                            </span>
                        </div>
                    )}
                    {event.imageAmount !== undefined && event.imageAmount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Image</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black font-fredoka bg-red-50 text-red-600 border border-red-100">
                                -{event.imageAmount}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black font-fredoka ${event.type === 'credit'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                    {event.type === 'credit' ? '+' : '-'}{event.amount}
                </span>
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
