import React from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle } from "lucide-react";

const FAQS = [
    {
        question: "How does the AI storyteller work?",
        answer: "LumoMind uses advanced AI to craft stories tailored to your child's age, interests, and reading level. It generates both the text and beautiful illustrations to make every story unique!"
    },
    {
        question: "Is LumoMind safe for my child?",
        answer: "Absolutely. We are COPPA compliant and prioritize child safety. There are no social features, no public sharing, and all content is AI-filtered to ensure it is always age-appropriate."
    },
    {
        question: "What are 'Magic Words'?",
        answer: "Magic Words are tricky vocabulary items that the AI highlights. When your child taps them, Lumo explains the meaning in simple, kid-friendly terms and adds it to their personal collection for review."
    },
    {
        question: "How many stories can I create?",
        answer: "Our Free plan allows you to explore the library and try out the story maker. The Pro plan gives you 20 AI-generated stories every month along with high-res images and premium features."
    },
    {
        question: "Can I use LumoMind on multiple devices?",
        answer: "Yes! Your account syncs across all devices. You can start a story on your tablet and finish it on your phone."
    },
    {
        question: "How do I cancel my subscription?",
        answer: "You can cancel your subscription at any time through the Billing section in your Account settings. You'll continue to have Pro access until the end of your billing cycle."
    }
];

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-shell pt-10 pb-32 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 font-fredoka font-black text-ink-muted hover:text-ink transition-colors uppercase tracking-wider text-sm mb-12">
                    <ArrowLeft className="w-4 h-4" />
                    Back to LumoMind
                </Link>

                <header className="mb-12 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 mb-4">
                        <HelpCircle className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-black font-fredoka text-purple-600 uppercase tracking-wider">Support</span>
                    </div>
                    <h1 className="text-5xl font-black text-ink font-fredoka mb-4">Common Questions</h1>
                    <p className="text-xl text-ink-muted font-medium font-nunito">Everthing you need to know about LumoMind magic.</p>
                </header>

                <div className="grid gap-6">
                    {FAQS.map((faq, i) => (
                        <div key={i} className="clay-card p-8 bg-white border-2 border-white shadow-clay-sm hover:shadow-clay transition-shadow">
                            <h3 className="text-xl font-black text-ink font-fredoka mb-3 lowercase first-letter:uppercase">{faq.question}</h3>
                            <p className="text-ink-muted font-medium font-nunito leading-relaxed">{faq.answer}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-16 clay-card p-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-center text-white">
                    <h2 className="text-3xl font-black font-fredoka mb-4">Still have questions?</h2>
                    <p className="text-indigo-100 font-medium mb-8">We&apos;re here to help! Send us a message and we&apos;ll get back to you soon.</p>
                    <Link href="/support/contact">
                        <button className="px-10 py-5 rounded-2xl bg-white text-indigo-600 font-black font-fredoka uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">
                            Contact Support
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
