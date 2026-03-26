"use client";

import { Paper, Question, StudentSubmission } from "@prisma/client";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, CheckCircle2, XCircle, Sparkles, Loader2, AlertCircle } from "lucide-react";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentReportView({ 
    paper, 
    submission 
}: { 
    paper: Paper & { questions: Question[] }, 
    submission: StudentSubmission 
}) {
    // We strictly wait for fonts to load before printing layout is finalized
    useEffect(() => {
        if (typeof document !== 'undefined' && document.fonts) {
            document.fonts.ready.then(() => {
                // Fonts loaded
            });
        }
    }, []);

    const [aiFeedback, setAiFeedback] = useState<Record<string, any>>((submission as any).aiFeedback as Record<string, any> || {});
    const [gradingState, setGradingState] = useState<Record<string, boolean>>({});

    const handleGradeWithAI = async (questionId: string) => {
        setGradingState(prev => ({ ...prev, [questionId]: true }));
        try {
            const res = await fetch('/api/ai/grade-descriptive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId: submission.id, questionId })
            });
            const data = await res.json();
            if (data.success && data.feedback) {
                setAiFeedback(prev => ({ ...prev, [questionId]: data.feedback }));
            } else {
                alert(data.error || 'Failed to grade');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred during AI grading');
        } finally {
            setGradingState(prev => ({ ...prev, [questionId]: false }));
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const responses = submission.responses as Record<string, any> || {};

    return (
        <div className="min-h-screen bg-gray-50 print:bg-white pb-20">
            {/* Top Navigation Bar / Print Action - Hidden when printing */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 print:hidden shadow-sm">
                <Link href={`/dashboard/submissions/${paper.id}`}>
                    <Button variant="ghost" className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Submissions
                    </Button>
                </Link>
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" /> Download PDF Report
                </Button>
            </div>

            {/* A4 Printable Page Container */}
            <div className="max-w-[210mm] mx-auto bg-white sm:mt-8 p-[15mm] sm:p-[20mm] sm:shadow-xl print:shadow-none print:mt-0 print:p-0">
                {/* Report Header */}
                <div className="border-b-2 border-indigo-100 pb-6 mb-8 text-center">
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{paper.schoolName}</h1>
                    <h2 className="text-xl font-bold text-gray-700 mt-2">{paper.examName}</h2>
                    <p className="text-gray-500 font-medium">Subject: {paper.subject}</p>
                </div>

                {/* Student Info Box */}
                <div className="bg-gray-50 print:bg-transparent print:border print:border-gray-200 rounded-xl p-6 mb-8 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Student Details</p>
                        <div className="flex items-center gap-3">
                            <p className="text-xl font-bold text-gray-900">{submission.studentName}</p>
                            {(submission.cheatWarnings ?? 0) > 0 && (
                                <span className="flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                    <AlertCircle className="w-3 h-3 mr-1" /> Flagged: {submission.cheatWarnings} Tab Switches
                                </span>
                            )}
                        </div>
                        <p className="text-gray-600 mt-1">Roll No: <span className="font-semibold">{submission.rollNo || "N/A"}</span> | Class: <span className="font-semibold">{submission.division || "N/A"}</span></p>
                        <p className="text-xs text-gray-400 mt-2">Submitted: {dayjs(submission.submittedAt).format("MMMM D, YYYY • h:mm A")}</p>
                    </div>
                    <div className="text-right bg-white p-4 rounded-lg shadow-sm print:shadow-none print:border print:border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Final Score</p>
                        <p className="text-4xl font-black text-indigo-600">{submission.totalScore} <span className="text-lg text-gray-400 font-bold">/ {paper.totalMarks}</span></p>
                    </div>
                </div>

                {/* Questions and Answers Summary */}
                <div className="space-y-8">
                    {paper.questions.map((q, index) => {
                        const content: any = q.content;
                        const studentAnswer = responses[q.id];
                        let isCorrect = false;
                        let isAutoGradable = false;
                        let correctAnswerDisplay: React.ReactNode = null;

                        if (q.type === "MCQ") {
                            isAutoGradable = true;
                            if (typeof content.correctIndex === 'number') {
                                isCorrect = studentAnswer === content.correctIndex;
                                correctAnswerDisplay = <Latex>{content.options[content.correctIndex]}</Latex>;
                            }
                        } else if (q.type === "TF") {
                            isAutoGradable = true;
                            if (typeof content.isTrue === 'boolean') {
                                isCorrect = studentAnswer === content.isTrue;
                                correctAnswerDisplay = content.isTrue ? "True" : "False";
                            }
                        }

                        // Status Badge
                        let statusBadge = null;
                        if (isAutoGradable) {
                            if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
                                statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unattempted</span>;
                            } else if (isCorrect) {
                                statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Correct (+{q.marks})</span>;
                            } else {
                                statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Incorrect (0)</span>;
                            }
                        } else {
                            statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Manual Grading Required</span>;
                        }

                        return (
                            <div key={q.id} className="border border-gray-200 rounded-xl p-6 bg-white break-inside-avoid">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-start gap-3">
                                        <span className="font-bold text-indigo-900 bg-indigo-50 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                            {index + 1}
                                        </span>
                                        <div className="text-gray-900 text-lg font-medium pt-1">
                                            <Latex>{content.questionText || ""}</Latex>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 ml-4">
                                        <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">
                                            [{q.marks} Marks]
                                        </span>
                                        {statusBadge}
                                    </div>
                                </div>

                                {/* Answers Section */}
                                <div className="ml-11 mt-4 space-y-3">
                                    {q.type === "MCQ" && content.options && (
                                        <div className="space-y-2">
                                            {content.options.map((opt: string, optIndex: number) => {
                                                const isStudentChoice = studentAnswer === optIndex;
                                                const isActualCorrect = content.correctIndex === optIndex;
                                                
                                                let borderClass = "border-gray-200";
                                                let bgClass = "bg-white";
                                                let icon = null;

                                                if (isActualCorrect) {
                                                    borderClass = "border-green-500";
                                                    bgClass = isStudentChoice ? "bg-green-50" : "bg-white";
                                                    icon = <CheckCircle2 className="w-5 h-5 text-green-500 absolute right-3" />;
                                                } else if (isStudentChoice && !isActualCorrect) {
                                                    borderClass = "border-red-500";
                                                    bgClass = "bg-red-50";
                                                    icon = <XCircle className="w-5 h-5 text-red-500 absolute right-3" />;
                                                }

                                                return (
                                                    <div key={optIndex} className={`relative flex items-center p-3 rounded-lg border ${borderClass} ${bgClass}`}>
                                                        <div className={`w-4 h-4 rounded-full border mr-3 flex-shrink-0 flex items-center justify-center ${
                                                            isStudentChoice ? (isActualCorrect ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500') : 'border-gray-300'
                                                        }`}>
                                                            {isStudentChoice && <div className="w-2 h-2 rounded-full bg-white" />}
                                                        </div>
                                                        <span className="text-gray-800 flex-1 pr-8">
                                                            <Latex>{opt}</Latex>
                                                        </span>
                                                        {icon}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {q.type === "TF" && (
                                        <div className="flex gap-4">
                                            {['True', 'False'].map((opt) => {
                                                const isTrueValue = opt === 'True';
                                                const isStudentChoice = studentAnswer === isTrueValue;
                                                const isActualCorrect = content.isTrue === isTrueValue;
                                                
                                                let borderClass = "border-gray-200";
                                                let bgClass = "bg-white";

                                                if (isActualCorrect) {
                                                    borderClass = "border-green-500";
                                                    bgClass = isStudentChoice ? "bg-green-50 text-green-800 font-bold" : "bg-white";
                                                } else if (isStudentChoice && !isActualCorrect) {
                                                    borderClass = "border-red-500";
                                                    bgClass = "bg-red-50 text-red-800 font-bold";
                                                }

                                                return (
                                                    <div key={opt} className={`flex-1 flex items-center justify-center p-3 rounded-lg border relative ${borderClass} ${bgClass}`}>
                                                        {opt}
                                                        {isActualCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-2" />}
                                                        {isStudentChoice && !isActualCorrect && <XCircle className="w-4 h-4 text-red-500 absolute right-2" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* MATCH Rendering */}
                                    {q.type === "MATCH" && (
                                        <div className="mt-2 text-sm w-full">
                                            <p className="font-semibold text-gray-500 mb-2">Student's Matching Selections:</p>
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                {typeof studentAnswer === 'object' && studentAnswer !== null ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {(content.pairs || []).map((pair: any, pIndex: number) => {
                                                            const selectedLetter = studentAnswer[pIndex];
                                                            const selectedIndex = selectedLetter ? selectedLetter.charCodeAt(0) - 97 : -1;
                                                            const selectedRightText = selectedIndex !== -1 && content.pairs[selectedIndex] ? content.pairs[selectedIndex].right : "No selection";
                                                            return (
                                                                <div key={pIndex} className="flex flex-col p-3 bg-white rounded border border-gray-200 shadow-sm">
                                                                    <div className="font-bold text-gray-700 text-sm mb-1">{pIndex + 1}. <Latex>{pair.left || ""}</Latex></div>
                                                                    <div className="flex items-start text-indigo-700 bg-indigo-50/50 p-2 rounded text-xs gap-2">
                                                                        <span className="font-bold shrink-0">&rarr;</span> 
                                                                        <span className="font-extrabold shrink-0">{selectedLetter ? `(${selectedLetter})` : '(No Match)'}</span>
                                                                        <span className="text-gray-700 font-medium break-words"><Latex>{selectedRightText || ""}</Latex></span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">No valid matching mapped. {typeof studentAnswer === 'string' ? studentAnswer : ''}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* DATA_TABLE Rendering */}
                                    {q.type === "DATA_TABLE" && (
                                        <div className="mt-2 text-sm w-full">
                                            <p className="font-semibold text-gray-500 mb-2">Student's Data Analysis:</p>
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap min-h-[60px]">
                                                {typeof studentAnswer === 'number' 
                                                    ? `Selected Option: ${String.fromCharCode(65 + studentAnswer)}` 
                                                    : (typeof studentAnswer === 'string' ? studentAnswer : <span className="text-gray-400 italic">No response provided.</span>)
                                                }
                                            </div>
                                        </div>
                                    )}

                                    {/* Descriptive & Non-Auto Graded Types */}
                                    {!isAutoGradable && q.type !== "MATCH" && q.type !== "DATA_TABLE" && (
                                        <div className="mt-2 text-sm">
                                            <p className="font-semibold text-gray-500 mb-1">Student's Response:</p>
                                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap min-h-[60px]">
                                                {typeof studentAnswer === 'string' ? studentAnswer : (studentAnswer !== undefined && studentAnswer !== null ? JSON.stringify(studentAnswer) : <span className="text-gray-400 italic">No response provided.</span>)}
                                            </div>
                                            
                                            {/* AI Grading Module */}
                                            <div className="mt-4 print:hidden">
                                                {aiFeedback[q.id] ? (
                                                    <div className="p-4 bg-fuchsia-50 rounded-xl border border-fuchsia-100">
                                                        <div className="flex items-center gap-2 mb-2 text-fuchsia-800 font-bold">
                                                            <Sparkles className="w-4 h-4" /> AI Grading Feedback
                                                        </div>
                                                        <p className="text-gray-700 text-sm mb-3 leading-relaxed">{aiFeedback[q.id].explanation}</p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-mono font-bold text-fuchsia-700 text-base">{aiFeedback[q.id].suggestedMarks} <span className="text-sm font-medium text-fuchsia-600/70">/ {q.marks} Marks</span></span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={() => handleGradeWithAI(q.id)}
                                                        disabled={gradingState[q.id] || !isStudentChoiceDefined(studentAnswer)}
                                                        className="text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700"
                                                    >
                                                        {gradingState[q.id] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                        Grade with AI
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Correction Area for Wrong Answers (Optional contextual text) */}
                                    {isAutoGradable && !isCorrect && isStudentChoiceDefined(studentAnswer) && (
                                        <div className="mt-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm">
                                            <span className="font-semibold text-indigo-900">Correct Answer: </span> 
                                            <span className="text-indigo-800">{correctAnswerDisplay}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-400 text-xs pb-10">
                    <p>Generated by ExamCraft Pro • Automatically Graded Submissions Report</p>
                </div>
            </div>
            
            {/* Print CSS explicitly for this PDF Layout */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                    /* Ensure headers/nav are hidden */
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    .print\\:border {
                        border-width: 1px !important;
                    }
                    /* Keep page breaks clean */
                    .break-inside-avoid {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
}

function isStudentChoiceDefined(answer: any) {
    return answer !== undefined && answer !== null && answer !== '';
}
