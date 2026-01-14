import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-shell pt-10 pb-32 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 font-fredoka font-black text-ink-muted hover:text-ink transition-colors uppercase tracking-wider text-sm mb-12">
                    <ArrowLeft className="w-4 h-4" />
                    Back to LumoMind
                </Link>

                <div className="clay-card p-8 md:p-12 bg-white">
                    <header className="mb-12 border-b-2 border-slate-50 pb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 mb-4">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-black font-fredoka text-blue-600 uppercase tracking-wider">Legal</span>
                        </div>
                        <h1 className="text-5xl font-black text-ink font-fredoka mb-4">Privacy Policy</h1>
                        <p className="text-ink-muted font-bold font-nunito">Last updated: January 14, 2026</p>
                    </header>

                    <div className="prose prose-slate max-w-none prose-headings:font-fredoka prose-headings:text-ink prose-p:text-ink-muted prose-p:font-medium prose-strong:text-ink font-nunito">
                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">1. Introduction</h2>
                            <p>
                                Welcome to LumoMind. We are committed to protecting your privacy and ensuring a safe experience for you and your children. 
                                This Privacy Policy explains how we collect, use, and safeguard information when you use our website and services.
                            </p>
                        </section>

                        <section className="mb-10 bg-blue-50/50 p-6 rounded-3xl border-2 border-blue-100">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-blue-700">2. COPPA Compliance (Children&apos;s Privacy)</h2>
                            <p className="font-bold text-blue-800">
                                LumoMind is designed for children, and we prioritize their safety above all else.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 mt-4 text-blue-800/80">
                                <li>We do not collect personal information from children without verifiable parental consent.</li>
                                <li>Children cannot access social features or share data publicly.</li>
                                <li>All child profiles are managed by a parent/guardian account.</li>
                                <li>We limit data collection to only what is necessary to provide the service (e.g., reading progress, interests for story generation).</li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">3. Information We Collect</h2>
                            <h3 className="text-xl font-bold mb-2">Account Information</h3>
                            <p>
                                When parents register, we collect email addresses and billing information (via our secure payment processors).
                            </p>
                            <h3 className="text-xl font-bold mb-2 mt-4">Usage Data</h3>
                            <p>
                                We collect information about how the app is used, such as stories read, words learned, and reading progress, to provide a personalized experience.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">4. How We Use Information</h2>
                            <p>
                                We use the collected data to:
                            </p>
                            <ul className="list-disc pl-5 mt-4 space-y-2">
                                <li>Generate personalized stories using AI.</li>
                                <li>Track reading progress and award badges.</li>
                                <li>Improve our AI models and educational content.</li>
                                <li>Provide customer support.</li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">5. Data Security</h2>
                            <p>
                                We implement industry-standard security measures to protect your data. We do not sell your or your child&apos;s data to third parties.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">6. Your Rights</h2>
                            <p>
                                You have the right to access, correct, or delete your data at any time. You can also withdraw consent for your child&apos;s data collection by contacting us.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">7. Contact Us</h2>
                            <p>
                                If you have any questions about this Privacy Policy, please contact us at support@lumomind.com.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
