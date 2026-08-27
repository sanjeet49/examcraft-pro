import { useState, useEffect } from "react";
import { Loader2, Sparkles, Brain, BookOpen, Lightbulb } from "lucide-react";

const aiFacts = [
    { title: "Did you know?", text: "The first AI program was written in 1951 to play checkers at the University of Manchester.", icon: Brain },
    { title: "Teacher's Helper", text: "AI can save teachers up to 12 hours a week on administrative and grading tasks.", icon: BookOpen },
    { title: "Brain Fact", text: "The human brain generates about 20 watts of electrical power while awake — enough to power a dim lightbulb!", icon: Lightbulb },
    { title: "Smart Generation", text: "We are actively analyzing your text to extract precise question structures, keeping original contexts intact.", icon: Sparkles },
    { title: "Did you know?", text: "The word 'Robot' comes from the Czech word 'robota' meaning forced labor.", icon: Brain },
    { title: "Education Tech", text: "Intelligent tutoring systems can improve student test scores by over 30%.", icon: BookOpen },
    { title: "Machine Learning", text: "Our AI is scanning thousands of parameters right now to bring you the best possible exam variant.", icon: Sparkles },
];

export function AILoadingOverlay({ isVisible }: { isVisible: boolean }) {
    const [factIndex, setFactIndex] = useState(0);

    useEffect(() => {
        if (!isVisible) return;

        // Randomize starting fact
        setFactIndex(Math.floor(Math.random() * aiFacts.length));

        const interval = setInterval(() => {
            setFactIndex((prev) => (prev + 1) % aiFacts.length);
        }, 3500); // Change fact every 3.5 seconds

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    const currentFact = aiFacts[factIndex];
    const Icon = currentFact.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white border shadow-2xl rounded-2xl p-8 max-w-md w-full mx-4 flex flex-col items-center text-center transform scale-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-indigo-600 text-white p-4 rounded-full shadow-lg">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">
                    AI is Thinking...
                </h2>

                <p className="text-gray-500 mb-8">
                    Please hold on while our AI processes your request. This usually takes just a few seconds.
                </p>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 w-full relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                    <div className="flex items-start gap-4 transition-all duration-500 ease-in-out">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0">
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h4 className="font-semibold text-indigo-900 text-sm mb-1">{currentFact.title}</h4>
                            <p className="text-indigo-700/80 text-sm leading-relaxed min-h-[40px] transition-all">
                                {currentFact.text}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
