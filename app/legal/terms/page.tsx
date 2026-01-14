import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-shell pt-10 pb-32 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 font-fredoka font-black text-ink-muted hover:text-ink transition-colors uppercase tracking-wider text-sm mb-12">
                    <ArrowLeft className="w-4 h-4" />
                    Back to LumoMind
                </Link>

                <div className="clay-card p-8 md:p-12 bg-white">
                    <header className="mb-12 border-b-2 border-slate-50 pb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 mb-4">
                            <FileText className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-black font-fredoka text-orange-600 uppercase tracking-wider">Legal</span>
                        </div>
                        <h1 className="text-5xl font-black text-ink font-fredoka mb-4">Terms of Service</h1>
                        <p className="text-ink-muted font-bold font-nunito">Last updated: January 14, 2026</p>
                    </header>

                    <div className="prose prose-slate max-w-none prose-headings:font-fredoka prose-headings:text-ink prose-p:text-ink-muted prose-p:font-medium prose-strong:text-ink font-nunito">
                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using LumoMind, you agree to be bound by these Terms of Service. If you are using the service on behalf of a minor, you agree to these terms for yourself and the minor.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">2. Description of Service</h2>
                            <p>
                                LumoMind provides an AI-powered reading and language learning platform for children. Features include personalized story generation, interactive reading tools, and vocabulary tracking.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">3. User Accounts</h2>
                            <p>
                                You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">4. Subscriptions and Payments</h2>
                            <p>
                                Some features of LumoMind require a paid subscription. All fees are non-refundable unless required by law. Subscriptions renew automatically unless cancelled via your account settings.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">5. Intellectual Property</h2>
                            <p>
                                All content on LumoMind, including text, graphics, and AI-generated stories, is the property of LumoMind or its licensors. You are granted a limited, non-exclusive license to use the service for personal, non-commercial purposes.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">6. Acceptable Use</h2>
                            <p>
                                You agree not to use the service for any illegal purposes or to generate harmful, offensive, or inappropriate content. We reserve the right to terminate accounts that violate these terms.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">7. Limitation of Liability</h2>
                            <p>
                                LumoMind is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">8. Changes to Terms</h2>
                            <p>
                                We may update these Terms of Service from time to time. We will notify you of any significant changes by posting the new terms on our website.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">9. Contact</h2>
                            <p>
                                For questions regarding these terms, please contact us at legal@lumomind.com.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
