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
                    <button className="text-sm font-bold font-nunito text-purple-600 hover:text-purple-700">View All</button>
                </div>
                
                <div className="clay-card bg-white rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black font-fredoka text-slate-400 uppercase tracking-widest">Activity</th>
                                    <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-black font-fredoka text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-black font-fredoka text-slate-400 uppercase tracking-widest">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((event) => (
                                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {/* Icon or Cover */}
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
                                                    event.coverImageUrl ? "bg-slate-100" : (event.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')
                                                }`}>
                                                    {event.coverImageUrl ? (
                                                        <CachedImage 
                                                            src={event.coverImageUrl} 
                                                            alt={event.description} 
                                                            width={48} 
                                                            height={48} 
                                                            className="w-full h-full object-cover"
                                                            bucket="book-assets"
                                                        />
                                                    ) : (
                                                        event.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <Clock className="w-5 h-5" />
                                                    )}
                                                </div>
                                                
                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold font-nunito text-ink text-sm truncate">{event.action}</p>
                                                    
                                                    {event.bookId ? (
                                                        <Link href={`/reader/${event.bookId}`} className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline line-clamp-1 block">
                                                            {event.description}
                                                        </Link>
                                                    ) : (
                                                        <p className="text-xs font-semibold text-slate-400 line-clamp-1">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                    
                                                    {/* Mobile Date */}
                                                    <p className="md:hidden text-[10px] font-bold text-slate-400 mt-0.5" suppressHydrationWarning>
                                                        {new Date(event.timestamp).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4">
                                            <p className="text-sm font-bold text-slate-500 font-nunito" suppressHydrationWarning>
                                                {new Date(event.timestamp).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: 'numeric'
                                                })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black font-fredoka ${
                                                event.type === 'credit' 
                                                ? 'bg-emerald-100 text-emerald-600' 
                                                : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {event.type === 'credit' ? '+' : '-'}{event.amount}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
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
