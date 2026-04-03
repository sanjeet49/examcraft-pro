"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, TrendingUp, Cpu, Globe, Sparkles, Brain, ChevronLeft, ChevronRight } from "lucide-react";

// ── 30 curated tech-trend quotes ─────────────────────────────────────────────
// Mix of inspirational, factual, and forward-looking tech/education insights.
// The list is intentionally long so day-based rotation keeps things fresh.
export const TECH_QUOTES = [
    {
        quote: "GPT-4o processes text, audio, and images simultaneously — the same multimodal future is coming to every classroom.",
        tag: "Generative AI",
        icon: Sparkles,
    },
    {
        quote: "By 2026, over 80% of enterprises will use generative AI APIs or deploy AI-enabled applications in production.",
        tag: "Industry Trend",
        icon: TrendingUp,
    },
    {
        quote: "Quantum computing reached 1,000+ qubit processors in 2024, moving error correction from theory to practice.",
        tag: "Quantum",
        icon: Cpu,
    },
    {
        quote: "AI agents that browse the web, write code, and execute tasks autonomously are the hottest research area of 2025.",
        tag: "Agentic AI",
        icon: Zap,
    },
    {
        quote: "India added 100 million new internet users in 2024 — the next wave of EdTech demand is already here.",
        tag: "EdTech India",
        icon: Globe,
    },
    {
        quote: "Retrieval-Augmented Generation (RAG) lets AI answer questions from your own documents — no fine-tuning needed.",
        tag: "LLM Trick",
        icon: Sparkles,
    },
    {
        quote: "The global EdTech market is projected to exceed $400 billion by 2028 — automation is at the core of that growth.",
        tag: "Market Insight",
        icon: TrendingUp,
    },
    {
        quote: "Apple Vision Pro and Meta Quest 3 are pioneering spatial computing — 3D interactive classrooms are closer than ever.",
        tag: "Spatial Computing",
        icon: Cpu,
    },
    {
        quote: "Gemini 2.5 Pro now has a 1M-token context window — it can read an entire textbook and write a complete exam from it.",
        tag: "Gemini AI",
        icon: Sparkles,
    },
    {
        quote: "Small Language Models (SLMs) like Phi-3 and Mistral run on-device — private AI that never leaves your school server.",
        tag: "On-Device AI",
        icon: Zap,
    },
    {
        quote: "In 2025, prompt engineering became a core skill — how you ask AI is as important as what you ask.",
        tag: "Prompt Design",
        icon: Sparkles,
    },
    {
        quote: "Next.js 15 Turbopack compile times are up to 96% faster than Webpack — modern web apps ship in real-time.",
        tag: "Web Dev",
        icon: Cpu,
    },
    {
        quote: "Open-source AI models (Llama 3, Mistral, Gemma) now rival proprietary GPT-4 on most benchmarks.",
        tag: "Open Source AI",
        icon: Globe,
    },
    {
        quote: "The NEP 2020 framework mandates digital literacy at every level — tools like ExamCraft are a direct answer to that call.",
        tag: "India Education",
        icon: TrendingUp,
    },
    {
        quote: "Vector databases (Pinecone, Qdrant, pgvector) are the hidden engine behind every smart AI search experience.",
        tag: "AI Infrastructure",
        icon: Cpu,
    },
    {
        quote: "AI-generated content is now used in 60% of Google search results pages — content creation has fundamentally changed.",
        tag: "Content AI",
        icon: Sparkles,
    },
    {
        quote: "WebAssembly (WASM) lets you run Python, Rust, or C++ inside the browser at near-native speed — no server needed.",
        tag: "Web Tech",
        icon: Zap,
    },
    {
        quote: "India's ONDC and UPI are globally cited as blueprints for building open, interoperable digital infrastructure.",
        tag: "Digital India",
        icon: Globe,
    },
    {
        quote: "Anthropic's Constitutional AI approach lets models self-correct against harmful outputs — safety by design.",
        tag: "AI Safety",
        icon: Cpu,
    },
    {
        quote: "Teachers who adopt AI tools report 40% more time for direct student interaction and creative lesson planning.",
        tag: "Teacher Productivity",
        icon: TrendingUp,
    },
    {
        quote: "Serverless edge computing (Vercel, Cloudflare Workers) reduces global API response times to under 50ms.",
        tag: "Edge Computing",
        icon: Zap,
    },
    {
        quote: "TypeScript usage has surpassed 50% of all new JavaScript projects — type safety is the new standard.",
        tag: "Dev Trend",
        icon: Cpu,
    },
    {
        quote: "AI-powered optical character recognition now reads handwritten exams with 95% accuracy in under 2 seconds.",
        tag: "AI + Assessment",
        icon: Sparkles,
    },
    {
        quote: "GitHub Copilot has been adopted by 1.8M+ developers — AI pair programming is no longer optional.",
        tag: "Dev AI",
        icon: Globe,
    },
    {
        quote: "The average LLM response is now faster than human typing — real-time AI collaboration is the new normal.",
        tag: "AI Speed",
        icon: Zap,
    },
    {
        quote: "Diffusion models don't just generate images — they're now synthesizing audio, video, and even 3D models.",
        tag: "Generative AI",
        icon: Sparkles,
    },
    {
        quote: "React Server Components shift rendering from the browser to the server, slashing JS bundle sizes by up to 30%.",
        tag: "React 19",
        icon: Cpu,
    },
    {
        quote: "India's AI startup ecosystem raised over $2.8B in 2024 — the country is now the 3rd largest AI talent pool globally.",
        tag: "India Tech",
        icon: TrendingUp,
    },
    {
        quote: "Memory-augmented AI (like ChatGPT Memory) can recall your past conversations — personalized AI tutors are here.",
        tag: "AI Memory",
        icon: Brain,
    },
    {
        quote: "The paperless classroom isn't a trend anymore — it's an expectation. Tools that bridge paper and digital win.",
        tag: "EdTech",
        icon: Globe,
    },
];

// ── Deterministic daily shuffle using date as seed ────────────────────────────
// The same teacher sees a different set each day, but the same set within a day.
function seededShuffle<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(s) % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getDailySeed(): number {
    const d = new Date();
    // Seed = YYYYMMDD as integer — changes exactly once per day
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TechQuoteTicker() {
    const [shuffled] = useState(() => seededShuffle(TECH_QUOTES, getDailySeed()));
    const [index, setIndex] = useState(0);
    const [animating, setAnimating] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const goTo = (next: number) => {
        if (animating) return;
        setAnimating(true);
        setTimeout(() => {
            setIndex((next + shuffled.length) % shuffled.length);
            setAnimating(false);
        }, 300);
    };

    const resetTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => goTo(index + 1), 7000);
    };

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setIndex(prev => (prev + 1) % shuffled.length);
        }, 7000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [shuffled.length]);

    const current = shuffled[index];
    const Icon = current.icon;

    return (
        <div className="border-t border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-4 py-3 flex items-center gap-3 min-h-[68px] print:hidden">
            {/* Tag badge */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="bg-indigo-100 text-indigo-600 rounded-lg p-1.5">
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide whitespace-nowrap">
                    {current.tag}
                </span>
            </div>

            {/* Quote text */}
            <p
                className="flex-1 text-xs text-gray-600 leading-relaxed transition-opacity duration-300"
                style={{ opacity: animating ? 0 : 1 }}
            >
                <span className="font-semibold text-indigo-700">💡 </span>
                {current.quote}
            </p>

            {/* Navigation arrows */}
            <div className="flex-shrink-0 flex gap-1">
                <button
                    onClick={() => { goTo(index - 1); resetTimer(); }}
                    className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                    aria-label="Previous quote"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => { goTo(index + 1); resetTimer(); }}
                    className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                    aria-label="Next quote"
                >
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Dot indicators (show 5 around current) */}
            <div className="flex-shrink-0 flex gap-0.5">
                {shuffled.slice(0, Math.min(5, shuffled.length)).map((_, i) => (
                    <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                            i === index % 5 ? "bg-indigo-500 scale-125" : "bg-indigo-200"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
