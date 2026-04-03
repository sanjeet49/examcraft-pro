import { useState, useEffect } from "react";
import { Loader2, Sparkles, Brain, Cpu, TrendingUp, Globe, Zap } from "lucide-react";

const techTrends = [
    {
        title: "Agentic AI",
        text: "AI agents that browse the web, write code, and execute multi-step tasks autonomously are the hottest research area of 2025.",
        icon: Sparkles,
    },
    {
        title: "Gemini 2.5 Pro",
        text: "Gemini's 1M-token context window can read an entire textbook and generate a full exam — exactly what's running right now.",
        icon: Brain,
    },
    {
        title: "EdTech Market",
        text: "The global EdTech market is projected to exceed $400 billion by 2028. AI-powered assessment tools are leading the charge.",
        icon: TrendingUp,
    },
    {
        title: "Teacher Productivity",
        text: "Teachers who adopt AI tools report 40% more time for direct student interaction and creative lesson planning.",
        icon: Sparkles,
    },
    {
        title: "RAG Technology",
        text: "Retrieval-Augmented Generation (RAG) lets AI answer from your own documents without any fine-tuning — magic, really.",
        icon: Cpu,
    },
    {
        title: "India EdTech",
        text: "India's NEP 2020 mandates digital literacy at every level — tools like ExamCraft are a direct answer to that national call.",
        icon: Globe,
    },
    {
        title: "Small LLMs",
        text: "Small Language Models like Phi-3 and Mistral run on-device — private AI that never leaves your school network.",
        icon: Zap,
    },
    {
        title: "AI Assessment",
        text: "AI-powered OCR now reads handwritten exam answers with 95%+ accuracy in under 2 seconds — grading just changed forever.",
        icon: Brain,
    },
    {
        title: "Prompt Engineering",
        text: "In 2025, how you ask AI became as critical as what you ask. Prompt design is now a core professional skill.",
        icon: Sparkles,
    },
    {
        title: "Open Source AI",
        text: "Llama 3, Mistral, and Gemma now rival proprietary GPT-4 on most benchmarks — open source AI is closing the gap fast.",
        icon: Globe,
    },
];

export function AILoadingOverlay({
    isVisible,
    message,
}: {
    isVisible: boolean;
    message?: string;
}) {
    const [factIndex, setFactIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        if (!isVisible) return;

        // Randomize starting fact
        setFactIndex(Math.floor(Math.random() * techTrends.length));

        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setFactIndex((prev) => (prev + 1) % techTrends.length);
                setFade(true);
            }, 350);
        }, 4000);

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    const current = techTrends[factIndex];
    const Icon = current.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity duration-300 print:hidden">
            <div className="bg-white border shadow-2xl rounded-2xl p-8 max-w-md w-full mx-4 flex flex-col items-center text-center">

                {/* Spinner */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-4 rounded-full shadow-lg">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">
                    AI is Thinking...
                </h2>

                <p className="text-gray-500 mb-6 text-sm">
                    {message || "Analyzing your content and crafting questions. This usually takes 10–30 seconds."}
                </p>

                {/* Tech Trend Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-5 w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-violet-500 rounded-l-xl"></div>

                    <div
                        className="flex items-start gap-4 transition-opacity duration-300"
                        style={{ opacity: fade ? 1 : 0 }}
                    >
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0">
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-indigo-900 text-sm">{current.title}</h4>
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">Trend</span>
                            </div>
                            <p className="text-indigo-700/80 text-sm leading-relaxed min-h-[48px]">
                                {current.text}
                            </p>
                        </div>
                    </div>

                    {/* Dot indicators */}
                    <div className="flex justify-center gap-1 mt-4">
                        {techTrends.map((_, i) => (
                            <div
                                key={i}
                                className={`rounded-full transition-all duration-300 ${
                                    i === factIndex
                                        ? "bg-indigo-500 w-3 h-1.5"
                                        : "bg-indigo-200 w-1.5 h-1.5"
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
