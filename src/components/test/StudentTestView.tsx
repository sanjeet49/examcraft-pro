"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Paper, Question } from "@prisma/client";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";
import { Loader2, CheckCircle2, AlertCircle, BarChart3, Check, X, MinusCircle } from "lucide-react";
import { useEffect, useRef } from "react";

export default function StudentTestView({ paper }: { paper: Paper & { questions: Question[] } }) {
    // 0 = Login, 1 = Exam, 2 = Success/Report, 3 = Already Taken
    const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
    const [studentName, setStudentName] = useState("");
    const [rollNo, setRollNo] = useState("");
    const [division, setDivision] = useState("");
    
    // Store answers by Question ID
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [report, setReport] = useState<any>(null);

    // Anti-Cheat & Timer States
    const [cheatWarnings, setCheatWarnings] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const submitRef = useRef<() => void>(undefined);
    const isSubmittingRef = useRef(false);

    // Check if already taken on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const hasTaken = localStorage.getItem(`exam_taken_${paper.id}`);
            if (hasTaken === "true") {
                setStep(3);
            }
        }
    }, [paper.id]);


    const handleAnswerChange = (questionId: string, value: any) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleSubmitTest = async () => {
        if (isSubmittingRef.current) return;
        setIsSubmitting(true);
        isSubmittingRef.current = true;
        setError("");
        try {
            const res = await fetch(`/api/paper/${paper.id}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentName,
                    rollNo,
                    division,
                    responses,
                    cheatWarnings
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit test");
            }
            
            const data = await res.json();
            if (data.report) {
                setReport(data.report);
            }

            // Prevent retakes on this browser
            if (typeof window !== "undefined") {
                localStorage.setItem(`exam_taken_${paper.id}`, "true");
                // Exit fullscreen on finish
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(e => console.log(e));
                }
            }

            setStep(2); // Success!
        } catch (err: any) {
            setError(err.message || "An error occurred during submission.");
            isSubmittingRef.current = false;
        } finally {
            setIsSubmitting(false);
        }
    };

    submitRef.current = handleSubmitTest;

    // Timer Initialization
    useEffect(() => {
        if (step === 1 && paper.timeLimit) {
            setTimeLeft(paper.timeLimit * 60);
        }
    }, [step, paper.timeLimit]);

    // Timer Countdown
    useEffect(() => {
        if (step === 1 && timeLeft !== null && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev !== null ? prev - 1 : null);
            }, 1000);
            return () => clearInterval(timer);
        } else if (step === 1 && timeLeft === 0) {
            // Auto submit when time reaches 0
            if (!isSubmittingRef.current) {
                alert("Time is up! Your answers will be automatically submitted.");
                submitRef.current?.();
            }
        }
    }, [step, timeLeft]);

    // Tab-Switching Detection (Anti-Cheat)
    useEffect(() => {
        if (step === 1) {
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    setCheatWarnings(prev => {
                        const newWarnings = prev + 1;
                        if (newWarnings >= 3) {
                            alert("Auto-submitting exam due to multiple tab switches.");
                            if (!isSubmittingRef.current) submitRef.current?.();
                        } else {
                            alert(`Warning ${newWarnings}/3: Tab switching is strictly prohibited! Do not leave the exam window.`);
                        }
                        return newWarnings;
                    });
                }
            };
            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
        }
    }, [step]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentName.trim()) {
            setError("Please enter your name to begin.");
            return;
        }
        setError("");
        
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (err) {
            console.log("Fullscreen request failed or disabled.");
        }

        setStep(1);
    };

    if (step === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-300">
                    <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{paper.examName || "Digital Assessment"}</h1>
                    <p className="text-center text-gray-500 text-sm mb-6">{paper.schoolName} • {paper.subject}</p>
                    
                    <form onSubmit={handleStart} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                            <Input 
                                id="name" 
                                placeholder="Enter your full name" 
                                value={studentName} 
                                onChange={(e) => setStudentName(e.target.value)} 
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="roll">Roll Number</Label>
                                <Input 
                                    id="roll" 
                                    placeholder="Optional" 
                                    value={rollNo} 
                                    onChange={(e) => setRollNo(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="div">Class/Section</Label>
                                <Input 
                                    id="div" 
                                    placeholder="Optional" 
                                    value={division} 
                                    onChange={(e) => setDivision(e.target.value)} 
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm py-2">{error}</p>}
                        
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg mt-4">
                            Start Test
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50 pb-20">
                <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center animate-in slide-in-from-bottom-8 duration-500 border border-gray-100">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Test Submitted!</h2>
                    <p className="text-gray-600 mb-8">
                        Thank you, <span className="font-semibold text-gray-800">{studentName}</span>. Your responses have been securely recorded.
                    </p>

                    {report && (
                        <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center border-b pb-3">
                                <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" /> 
                                Performance Report
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                    <div className="text-3xl font-black text-indigo-600">{report.totalScore} <span className="text-lg text-gray-400 font-medium">/ {report.maxScore}</span></div>
                                    <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 mt-1">Auto-Graded Score</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center flex flex-col justify-center">
                                    <div className="text-sm text-gray-600"><span className="text-green-600 font-bold">{report.correctCount}</span> Correct</div>
                                    <div className="text-sm text-gray-600 mt-1"><span className="text-red-500 font-bold">{report.wrongCount}</span> Wrong</div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-gray-100">
                                    <div className="flex items-center text-gray-700"><Check className="w-4 h-4 text-green-500 mr-2" /> Correct Answers</div>
                                    <div className="font-bold text-gray-900">{report.correctCount}</div>
                                </div>
                                <div className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-gray-100">
                                    <div className="flex items-center text-gray-700"><X className="w-4 h-4 text-red-500 mr-2" /> Incorrect Answers</div>
                                    <div className="font-bold text-gray-900">{report.wrongCount}</div>
                                </div>
                                {report.unattemptedCount > 0 && (
                                    <div className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center text-gray-700"><MinusCircle className="w-4 h-4 text-amber-500 mr-2" /> Unattempted</div>
                                        <div className="font-bold text-gray-900">{report.unattemptedCount}</div>
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-xs text-gray-400 mt-5 text-center italic">
                                * This report only includes automatically graded objective questions.
                            </p>
                        </div>
                    )}

                    <Button variant="outline" className="w-full h-12 text-gray-600 hover:text-gray-900 font-medium" onClick={() => window.close()}>
                        Close Tab
                    </Button>
                </div>
            </div>
        );
    }

    if (step === 3) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
                <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Already Attempted</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        You have already submitted responses for <span className="font-semibold">{paper.examName}</span> from this device. Multiple attempts are not permitted.
                    </p>
                    <p className="text-sm text-gray-500 italic block">
                        If you believe this is an error, please contact your instructor.
                    </p>
                </div>
            </div>
        );
    }

    // Step 1: The Exam View
    return (
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
            {/* Header info */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8 sticky top-4 z-10 border border-indigo-100 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{paper.examName}</h1>
                    <p className="text-sm text-gray-500">Candidate: <span className="font-semibold text-gray-700">{studentName} {rollNo ? `(${rollNo})` : ''}</span></p>
                </div>

                {timeLeft !== null && (
                    <div className="flex flex-col items-center justify-center bg-indigo-50 px-6 py-2 rounded-lg border border-indigo-200">
                        <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-0.5">Time Remaining</div>
                        <div className={`font-mono text-3xl font-black ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-indigo-900'}`}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                )}

                <div className="text-right">
                    <div className="text-sm text-gray-500">Total Marks</div>
                    <div className="font-mono font-bold text-indigo-700 text-lg">{paper.totalMarks}</div>
                </div>
            </div>

            <div className="space-y-8">
                {paper.questions.map((q, index) => {
                    const content: any = q.content;
                    
                    return (
                        <div key={q.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            {(q as any).sectionHeading && (
                                <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                                    {(q as any).sectionHeading}
                                </h2>
                            )}
                            
                            <div className="flex items-start gap-4">
                                <span className="font-bold text-indigo-900 bg-indigo-50 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                    {index + 1}
                                </span>
                                
                                <div className="flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="text-gray-800 text-lg">
                                            <Latex>{content.questionText || ""}</Latex>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-500 ml-4 flex-shrink-0">
                                            [{q.marks} Marks]
                                        </span>
                                    </div>

                                    {/* Handle various question types here */}
                                    {q.type === "MCQ" && content.options && (
                                        <div className="space-y-2 mt-4">
                                            {content.options.map((opt: string, optIndex: number) => (
                                                <label 
                                                    key={optIndex} 
                                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                                        responses[q.id] === optIndex 
                                                        ? 'border-indigo-500 bg-indigo-50' 
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name={`q_${q.id}`} 
                                                        value={optIndex}
                                                        checked={responses[q.id] === optIndex}
                                                        onChange={() => handleAnswerChange(q.id, optIndex)}
                                                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 flex-shrink-0" 
                                                    />
                                                    <span className="ml-3 text-gray-700 flex-1">
                                                        <Latex>{opt}</Latex>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === "TF" && (
                                        <div className="flex gap-4 mt-4">
                                            {['True', 'False'].map((opt, optIndex) => {
                                                const isTrueValue = opt === 'True';
                                                return (
                                                    <label 
                                                        key={opt} 
                                                        className={`flex-1 flex items-center justify-center p-4 rounded-lg border cursor-pointer transition-colors ${
                                                            responses[q.id] === isTrueValue 
                                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' 
                                                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                    >
                                                        <input 
                                                            type="radio" 
                                                            name={`q_${q.id}`} 
                                                            checked={responses[q.id] === isTrueValue}
                                                            onChange={() => handleAnswerChange(q.id, isTrueValue)}
                                                            className="hidden" 
                                                        />
                                                        {opt}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {(q.type === "DESCRIPTIVE" || q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER" || q.type === "CUSTOM") && (
                                        <div className="mt-4">
                                            <Textarea 
                                                placeholder="Type your answer here..."
                                                className="min-h-[120px] resize-y text-base"
                                                value={responses[q.id] || ""}
                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            />
                                        </div>
                                    )}
                                    
                                    {q.type === "FILL_IN_THE_BLANKS" && (
                                        <div className="mt-4">
                                            <Input 
                                                placeholder="Enter the missing word(s)"
                                                className="text-base h-12"
                                                value={responses[q.id] || ""}
                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {q.type === "MATCH" && (
                                        <div className="mt-4 space-y-4 w-full">
                                            {/* Render the matching layout natively for the student */}
                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                <table className="w-full text-sm border-collapse bg-white">
                                                    <thead>
                                                        <tr>
                                                            <th className="font-bold border-b border-gray-200 bg-gray-50 text-left py-2 px-3 w-1/2 text-gray-700">Column A</th>
                                                            <th className="font-bold border-b border-gray-200 bg-gray-50 text-left py-2 px-4 w-1/2 text-gray-700">Column B</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(content.pairs || []).map((pair: any, pIndex: number) => (
                                                            <tr key={pIndex} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                                                <td className="py-3 px-3 pr-4 text-gray-800 align-top">
                                                                    <span className="font-semibold text-indigo-700 mr-2">{pIndex + 1}.</span> 
                                                                    <Latex>{pair.left || ""}</Latex>
                                                                </td>
                                                                <td className="py-3 px-4 pl-4 text-gray-800 border-l border-gray-100 align-top">
                                                                    <span className="font-semibold text-indigo-700 mr-2">({String.fromCharCode(97 + pIndex)})</span> 
                                                                    <Latex>{pair.right || ""}</Latex>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Interactive matching input grids */}
                                            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mt-2">
                                                <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center">
                                                    Select your matches:
                                                </h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                    {(content.pairs || []).map((_: any, pIndex: number) => (
                                                        <div key={pIndex} className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border border-gray-200 shadow-sm transition hover:border-indigo-300">
                                                            <span className="font-bold text-gray-700 w-8">{pIndex + 1} &rarr;</span>
                                                            <select
                                                                className="flex-1 bg-transparent outline-none text-indigo-700 font-bold cursor-pointer"
                                                                value={(responses[q.id] && responses[q.id][pIndex]) || ""}
                                                                onChange={(e) => {
                                                                    const currentAnswers = responses[q.id] || {};
                                                                    handleAnswerChange(q.id, {
                                                                        ...currentAnswers,
                                                                        [pIndex]: e.target.value
                                                                    });
                                                                }}
                                                            >
                                                                <option value="" disabled>-</option>
                                                                {(content.pairs || []).map((_: any, optIndex: number) => {
                                                                    const letter = String.fromCharCode(97 + optIndex);
                                                                    return <option key={optIndex} value={letter}>{letter}</option>;
                                                                })}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {q.type === "DATA_TABLE" && (
                                        <div className="mt-4 space-y-4 w-full">
                                            {/* Render the data table for reading */}
                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                <table className="w-full text-sm border-collapse bg-white text-center">
                                                    <tbody>
                                                        {(content.tableData || []).map((row: string[], rIndex: number) => (
                                                            <tr key={rIndex} className="border-b border-gray-100 last:border-0">
                                                                {row.map((cell: string, cIndex: number) => (
                                                                    <td key={cIndex} className={`p-3 border-r border-gray-100 last:border-0 ${rIndex === 0 ? "font-bold bg-gray-50 text-gray-700" : "text-gray-600"}`}>
                                                                        <Latex>{cell || ""}</Latex>
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* If there are MCQ options attached to the Data Table */}
                                            {content.options && content.options.some((o: string) => o.trim() !== "") ? (
                                                <div className="space-y-2 mt-4">
                                                    {content.options.map((opt: string, optIndex: number) => (
                                                        <label 
                                                            key={optIndex} 
                                                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                                                responses[q.id] === optIndex 
                                                                ? 'border-indigo-500 bg-indigo-50' 
                                                                : 'border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="radio" 
                                                                name={`q_${q.id}`} 
                                                                value={optIndex}
                                                                checked={responses[q.id] === optIndex}
                                                                onChange={() => handleAnswerChange(q.id, optIndex)}
                                                                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 flex-shrink-0" 
                                                            />
                                                            <span className="ml-3 text-gray-700 flex-1">
                                                                <Latex>{opt}</Latex>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                /* If it's a descriptive answer about the table */
                                                <div className="mt-4">
                                                    <Textarea 
                                                        placeholder="Provide your answer or analysis based on the table data above..."
                                                        className="min-h-[120px] resize-y text-base"
                                                        value={responses[q.id] || ""}
                                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Additional generic fallback for unimplemented UI types (Map) */}
                                    {q.type === "MAP" && (
                                        <div className="mt-4 w-full">
                                            <Textarea 
                                                placeholder="Provide your answer or explanation for this custom question here..."
                                                className="min-h-[100px] text-base"
                                                value={responses[q.id] || ""}
                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            />
                                            <p className="text-xs text-gray-400 mt-2">*This question type might require a manual text description of your intended arrangement.</p>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-10 mb-20 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                {error && <div className="text-red-500 text-center mb-4 font-medium">{error}</div>}
                <Button 
                    onClick={handleSubmitTest} 
                    disabled={isSubmitting}
                    className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-md"
                >
                    {isSubmitting ? (
                        <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Submitting Test...</>
                    ) : (
                        "Submit Final Answers"
                    )}
                </Button>
                <p className="text-center text-sm text-gray-500 mt-4">Please verify all your answers before submitting. You cannot edit them afterwards.</p>
            </div>
        </div>
    );
}
