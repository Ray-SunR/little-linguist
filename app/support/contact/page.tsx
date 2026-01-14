import React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Send } from "lucide-react";

export default function ContactPage() {
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
                        <div className="clay-card p-8 md:p-10 bg-white">
                            <form className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black font-fredoka text-ink uppercase tracking-widest ml-1">Your Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-purple-200 focus:bg-white outline-none transition-all font-medium"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black font-fredoka text-ink uppercase tracking-widest ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-purple-200 focus:bg-white outline-none transition-all font-medium"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black font-fredoka text-ink uppercase tracking-widest ml-1">Message</label>
                                    <textarea 
                                        className="w-full h-40 p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-purple-200 focus:bg-white outline-none transition-all font-medium resize-none"
                                        placeholder="How can we help?"
                                    />
                                </div>
                                <button 
                                    type="button"
                                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 py-5 rounded-[1.5rem] text-white font-black font-fredoka uppercase tracking-widest text-lg shadow-clay-purple hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Send className="w-5 h-5" />
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
