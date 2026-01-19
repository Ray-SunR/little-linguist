"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { submitFeedback } from "@/app/actions/feedback";
import { useAuth } from "@/components/auth/auth-provider";
import { motion, AnimatePresence } from "framer-motion";

export default function ContactPage() {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        type: "feedback",
        message: ""
    });

    // Pre-fill user data
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.user_metadata?.full_name || user.user_metadata?.name || "",
                email: user.email || ""
            }));
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await submitFeedback(formData);
            if (result.success) {
                setIsSuccess(true);
                setFormData(prev => ({ ...prev, message: "" }));
            } else {
                setError(result.error || "Something went wrong. Please try again.");
            }
        } catch (err) {
            setError("Failed to send message. Please check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-shell pt-10 pb-32 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/support/faq" className="inline-flex items-center gap-2 font-fredoka font-black text-ink-muted hover:text-ink transition-colors uppercase tracking-wider text-sm mb-12">
                    <ArrowLeft className="w-4 h-4" />
                    Back to FAQ
                </Link>

                <div className="grid md:grid-cols-5 gap-12 items-start">
                    <div className="md:col-span-2 space-y-8">
                        <header>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 mb-4">
                                <MessageCircle className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-black font-fredoka text-emerald-600 uppercase tracking-wider">Contact</span>
                            </div>
                            <h1 className="text-5xl font-black text-ink font-fredoka leading-tight mb-4">
                                Let&apos;s talk!
                            </h1>
                            <p className="text-lg text-ink-muted font-medium font-nunito leading-relaxed">
                                Have a question, suggestion, or just want to say hi? We&apos;d love to hear from you.
                            </p>
                        </header>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border-2 border-white shadow-clay-sm">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                                    <Mail className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black font-fredoka text-slate-400 uppercase tracking-widest">Email Us</p>
                                    <p className="font-bold text-ink">support@lumomind.com</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <div className="clay-card p-8 md:p-10 bg-white min-h-[500px] flex flex-col justify-center">
                            <AnimatePresence mode="wait">
                                {isSuccess ? (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center space-y-6 py-10"
                                    >
                                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-ink font-fredoka mb-2">Message Received!</h2>
                                            <p className="text-ink-muted font-medium font-nunito">
                                                Thanks for reaching out. Lumo will get back to you soon!
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setIsSuccess(false)}
                                            className="text-purple-600 font-bold font-fredoka uppercase tracking-widest hover:underline"
                                        >
                                            Send another message
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.form 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onSubmit={handleSubmit} 
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black font-fredoka text-ink uppercase tracking-widest ml-1">Your Name</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={formData.name}
                                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-purple-200 focus:bg-white outline-none transition-all font-medium"
                                                    placeholder="Full Name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black font-fredoka text-ink uppercase tracking-widest ml-1">Email Address</label>
                                                <input 
                                                    type="email" 
                                                    required
                                                    value={formData.email}
                                                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-purple-200 focus:bg-white outline-none transition-all font-medium"
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black font-fredoka text-ink uppercase tracking-widest ml-1">What are you sending?</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['feedback', 'feature_request', 'support'].map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, type }))}
                                                        className={`py-3 rounded-xl border-2 font-bold font-fredoka uppercase tracking-tighter text-[10px] transition-all ${
                                                            formData.type === type 
                                                                ? "bg-purple-100 border-purple-300 text-purple-700 shadow-inner" 
                                                                : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                                                        }`}
                                                    >
                                                        {type.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black font-fredoka text-ink uppercase tracking-widest ml-1">Message</label>
                                            <textarea 
                                                required
                                                value={formData.message}
                                                onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                                className="w-full h-40 p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-purple-200 focus:bg-white outline-none transition-all font-medium resize-none"
                                                placeholder={formData.type === 'feature_request' ? "Tell us about your awesome idea!" : "How can we help?"}
                                            />
                                        </div>

                                        {error && (
                                            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-xl border-2 border-rose-100">
                                                <AlertCircle className="w-5 h-5 shrink-0" />
                                                <p className="text-sm font-bold">{error}</p>
                                            </div>
                                        )}

                                        <button 
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 py-5 rounded-[1.5rem] text-white font-black font-fredoka uppercase tracking-widest text-lg shadow-clay-purple hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    Send Message
                                                </>
                                            )}
                                        </button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

