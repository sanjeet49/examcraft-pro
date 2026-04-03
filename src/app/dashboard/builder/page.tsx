"use client";

import { useState, useLayoutEffect, useRef, useEffect, Suspense, useCallback } from "react";
import { useSession } from "next-auth/react";
import { generateDocx, generatePdfViaBrowser } from "@/lib/exportUtils";
import { generateAnswerKeyPdf } from "@/lib/answerKeyUtils";
import { generateOmrPdf } from "@/lib/omrUtils";
import { PaperMetadata, Question, QuestionType } from "@/types/builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles, Plus, Trash2, Download, Save, Send, ShieldCheck, XCircle, Upload, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Minus, Circle, Eye, Pencil, Globe, Copy, Check } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { AILoadingOverlay } from "@/components/dashboard/AILoadingOverlay";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";

// Mock implementation of a simple unique ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

function BuilderContent() {
    const { update } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const paperId = searchParams.get("id");
    const [metadata, setMetadata] = useState<PaperMetadata>({
        schoolName: "",
        subject: "",
        examName: "",
        totalMarks: 100,
        date: "",
        instructions: "",
        standard: "",
        timeAllowed: "2 Hours",
        showStudentInfo: true
    });

    const [questions, setQuestions] = useState<Question[]>([]);
    const [smartPasteText, setSmartPasteText] = useState("");
    const [targetMarks, setTargetMarks] = useState<number>(50);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isGeneratingExam, setIsGeneratingExam] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>("MCQ");
    const [expandedSection, setExpandedSection] = useState<number>(0);
    const [pages, setPages] = useState<Question[][]>([[]]);
    const [status, setStatus] = useState<string>("DRAFT");
    const [mobileTab, setMobileTab] = useState<'build' | 'preview'>('build');
    const [fontsLoaded, setFontsLoaded] = useState(false);
    
    // Publish Online State
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const { data: session } = useSession();
    const userRole = session?.user?.role || "TEACHER";

    const questionsContainerRef = useRef<HTMLDivElement>(null);
    const headerContainerRef = useRef<HTMLDivElement>(null);

    // Toggle Publish State
    const handleTogglePublish = async () => {
        if (!paperId) return;
        setIsPublishing(true);
        const newStatus = !metadata.isPublishedOnline;
        try {
            const res = await fetch(`/api/paper/${paperId}/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPublishedOnline: newStatus }),
            });
            if (res.ok) {
                setMetadata(prev => ({ ...prev, isPublishedOnline: newStatus }));
                toast.success(newStatus ? "Paper is now Live!" : "Paper un-published.");
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCopyLink = () => {
        if (!paperId) return;
        const link = `${window.location.origin}/test/${paperId}`;
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast.success("Test Link Copied!");
    };

    // Calculate Marks dynamically set the A4 scale CSS variable so the preview paper fits the screen on mobile
    useEffect(() => {
        const A4_PX_WIDTH = 794; // 210mm at 96dpi
        const updateScale = () => {
            const availableWidth = window.innerWidth - 32; // 32px for p-4 left+right padding
            const scale = Math.min(1, availableWidth / A4_PX_WIDTH);
            document.documentElement.style.setProperty('--a4-mobile-scale', String(scale.toFixed(3)));
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        
        document.fonts.ready.then(() => {
            setFontsLoaded(true);
        });

        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMetadata((prev) => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        if (paperId) {
            fetch(`/api/paper/${paperId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.paper) {
                        const p = data.paper;
                        let d = "";
                        if (p.date) {
                            d = new Date(p.date).toISOString().split('T')[0];
                        }
                        setMetadata({
                            ...(p.layoutSettings || {}),
                            schoolName: p.schoolName || "",
                            subject: p.subject || "",
                            examName: p.examName || "",
                            totalMarks: p.totalMarks || 100,
                            date: d,
                            timeLimit: p.timeLimit || undefined,
                            instructions: p.layoutSettings?.instructions || "",
                            standard: p.layoutSettings?.standard || "",
                            timeAllowed: p.layoutSettings?.timeAllowed || "",
                            showStudentInfo: p.layoutSettings?.showStudentInfo !== false,
                            isPublishedOnline: p.isPublishedOnline || false
                        });
                        setQuestions(p.questions || []);
                        setStatus(p.status || "DRAFT");
                    }
                })
                .catch(() => toast.error("Failed to load paper details"));
        }
    }, [paperId]);

    const addQuestion = (type: QuestionType, insertAfterIndex?: number, customHeadingOverride?: string, sectionHeadingOverride?: string) => {
        const newQuestion: Question = {
            id: generateId(),
            type,
            marks: 1,
            sequenceOrder: questions.length + 1,
            content: { questionText: "" },
        };

        if (type === "MCQ") {
            newQuestion.content = { questionText: "", options: ["", "", "", ""] };
        } else if (type === "MATCH") {
            newQuestion.content = { questionText: "", pairs: [{ left: "", right: "" }] };
        } else if (type === "DESCRIPTIVE") {
            newQuestion.content = { questionText: "", linesRequired: 5 };
        } else if (type === "SHORT_ANSWER") {
            newQuestion.content = { questionText: "", linesRequired: 3 };
        } else if (type === "LONG_ANSWER") {
            newQuestion.content = { questionText: "", linesRequired: 10 };
        } else if (type === "MAP") {
            newQuestion.content = { questionText: "Mark the following places on the map", placesToMark: [""] };
        } else if (type === "DATA_TABLE") {
            newQuestion.content = {
                questionText: "",
                tableData: [["Heading 1", "Heading 2"], ["Data 1", "Data 2"]],
                options: ["", "", "", ""]
            };
        } else if (type === "CUSTOM") {
            newQuestion.content = { questionText: "", linesRequired: 5 };
        }

        if (customHeadingOverride) {
            newQuestion.customHeading = customHeadingOverride;
        } else if (type === "CUSTOM") {
            newQuestion.customHeading = "Custom Question Heading";
        }

        if (sectionHeadingOverride) {
            newQuestion.sectionHeading = sectionHeadingOverride;
        }

        setQuestions((prev) => {
            const nextQuestions = [...prev];
            if (insertAfterIndex !== undefined) {
                nextQuestions.splice(insertAfterIndex + 1, 0, newQuestion);
            } else {
                nextQuestions.push(newQuestion);
            }

            // Re-sequence
            const resequenced = nextQuestions.map((q, i) => ({ ...q, sequenceOrder: i + 1 }));

            // Auto-expand the section that this new block belongs to
            let groupIndex = 0;
            for (let i = 1; i < resequenced.length; i++) {
                const curr = resequenced[i];
                const prev = resequenced[i - 1];
                if (curr.type !== prev.type || curr.customHeading !== prev.customHeading || curr.sectionHeading !== prev.sectionHeading) {
                    groupIndex++;
                }
                if (resequenced[i].id === newQuestion.id) break;
            }
            setExpandedSection(groupIndex);
            return resequenced;
        });
    };

    const removeQuestion = (id: string) => {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
    };

    const handleSmartPaste = async () => {
        if (!smartPasteText.trim() && uploadFiles.length === 0) {
            toast.error("Please enter instructions or upload a file to parse");
            return;
        }

        setIsParsing(true);
        try {
            const formData = new FormData();
            formData.append("text", smartPasteText);
            uploadFiles.forEach(file => {
                formData.append("files", file);
            });

            const res = await fetch("/api/ai/parse", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to parse");
            }
            if (data.questions && Array.isArray(data.questions)) {
                setQuestions((prev) => [
                    ...prev,
                    ...data.questions.map((q: any, i: number) => ({
                        ...q,
                        id: generateId(),
                        marks: Number(q.marks) || 1,
                        sequenceOrder: prev.length + i + 1
                    }))
                ]);
                toast.success(`Successfully parsed ${data.questions.length} questions!`);
                setSmartPasteText("");
                update(); // Force NextAuth to re-fetch the new DB token subtraction
            }
        } catch (e: any) {
            toast.error(e.message || "AI Parsing failed. Please try adding manually.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleGenerateFullExam = async () => {
        if (!smartPasteText.trim() && uploadFiles.length === 0) {
            toast.error("Please provide instructions or upload a Syllabus/PDF first.");
            return;
        }

        setIsGeneratingExam(true);
        toast.info(`AI is reading the document and writing a ${targetMarks}-mark Exam. This may take ~20 seconds...`);

        try {
            const formData = new FormData();
            formData.append("text", smartPasteText);
            formData.append("targetMarks", targetMarks.toString());
            uploadFiles.forEach(file => {
                formData.append("files", file);
            });
            referenceFiles.forEach(file => {
                formData.append("referenceFiles", file);
            });

            const res = await fetch("/api/ai/generate-from-pdf", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate exam");
            }

            if (data.questions && Array.isArray(data.questions)) {
                // Determine a new Variant Letter (e.g. Set A)
                setMetadata(prev => ({
                    ...prev,
                    examName: prev.examName ? prev.examName + " - Full Revision" : `Generated ${targetMarks}-Mark Exam`,
                    totalMarks: targetMarks
                }));

                const newQuestions = data.questions.map((q: any, i: number) => ({
                    ...q,
                    id: generateId(),
                    sequenceOrder: i + 1,
                    marks: Number(q.marks) || 1
                }));

                // Instead of appending, we replace existing questions when generating a FULL exam
                if (questions.length > 0) {
                    if (window.confirm(`This will replace your existing questions with a fresh ${targetMarks}-mark exam. Continue?`)) {
                        setQuestions(newQuestions);
                        setExpandedSection(0);
                    }
                } else {
                    setQuestions(newQuestions);
                    setExpandedSection(0);
                }
                
                toast.success(`Successfully hallucinated a ${targetMarks}-mark exam!`);
                setSmartPasteText("");
                update(); 
            }
        } catch (e: any) {
            toast.error(e.message || "AI Extraction failed. Check the file type (PDF/Word).");
        } finally {
            setIsGeneratingExam(false);
        }
    };

    const handleGenerateVariant = async () => {
        if (questions.length === 0) {
            toast.error("Add some questions before generating a variant.");
            return;
        }

        setIsParsing(true);
        toast.info("AI is analyzing and rewriting your exam...");

        try {
            const res = await fetch("/api/ai/variant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to generate variant");
            }
            if (data.questions && Array.isArray(data.questions)) {
                // Determine a new Variant Letter (e.g. Set B)
                let currentExamName = metadata.examName || "Exam";
                let newSetLetter = "B";

                // If it already says "Set A", change it to "Set B". If "Set B", change to "Set C"
                const setMatch = currentExamName.match(/Set ([A-Z])/i);
                if (setMatch) {
                    const currentLetter = setMatch[1].toUpperCase();
                    newSetLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
                    currentExamName = currentExamName.replace(/Set [A-Z]/i, `Set ${newSetLetter}`);
                } else {
                    currentExamName = `${currentExamName} - Set B`;
                }

                setMetadata(prev => ({
                    ...prev,
                    examName: currentExamName
                }));

                const newQuestions = data.questions.map((q: any) => ({
                    ...q,
                    id: generateId()
                }));

                setQuestions(newQuestions);
                toast.success(`Successfully generated Exam Set ${newSetLetter}!`);
                update(); // Force NextAuth to re-fetch the new DB token subtraction
            }
        } catch (e: any) {
            toast.error(e.message || "AI Variant Generation failed. Check your API key or credits.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleShufflePaper = () => {
        if (questions.length === 0) {
            toast.error("Add some questions before shuffling.");
            return;
        }

        // 1. Shallow clone and shuffle the main questions array
        let shuffledQuestions = [...questions];
        for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
        }

        // 2. Deep clone contents and shuffle multiple choice options locally
        shuffledQuestions = shuffledQuestions.map((q, newGlobalIndex) => {
            const newQ = { ...q, id: generateId(), sequenceOrder: newGlobalIndex + 1, content: JSON.parse(JSON.stringify(q.content)) };

            if ((newQ.type === "MCQ" || newQ.type === "DATA_TABLE") && newQ.content.options && newQ.content.options.length > 0) {
                const opts = [...newQ.content.options];
                let originalCorrectValue = null;
                if (typeof newQ.content.correctIndex === 'number') {
                    originalCorrectValue = opts[newQ.content.correctIndex];
                }

                // Shuffle options
                for (let i = opts.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [opts[i], opts[j]] = [opts[j], opts[i]];
                }

                newQ.content.options = opts;

                // Re-find correct index
                if (originalCorrectValue !== null) {
                    newQ.content.correctIndex = opts.findIndex(o => o === originalCorrectValue);
                }
            }
            return newQ;
        });

        // 3. Automatically rename paper variant
        const variantChar = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random A-Z
        const saltId = Math.floor(1000 + Math.random() * 9000); // 4 digit salt

        setMetadata(prev => ({
            ...prev,
            examName: `${prev.examName || "Exam"} - Set ${variantChar} (${saltId})`
        }));

        setQuestions(shuffledQuestions);
        toast.success(`Successfully generated Exam Set ${variantChar} (${saltId})! Answer Key tracking updated.`);
    };

    const handleSavePaper = async () => {
        if (questions.length === 0) {
            toast.error("Please add at least one question before saving.");
            return;
        }

        const currentMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
        if (currentMarks !== Number(metadata.totalMarks)) {
            toast.warning("Marks mismatch! Please ensure marks distribute evenly.");
        }

        setIsSaving(true);
        try {
            const url = paperId ? `/api/paper/${paperId}` : "/api/paper/save";
            const method = paperId ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ metadata, questions }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to save paper");
            }

            toast.success(paperId ? "Paper updated successfully!" : "Paper saved successfully to database!");

            if (!paperId && data.paper?.id) {
                router.replace(`/dashboard/builder?id=${data.paper.id}`);
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to save paper to database.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!paperId) {
            toast.error("Please save the paper first before submitting.");
            return;
        }

        try {
            const res = await fetch("/api/admin/papers/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paperId, newStatus })
            });

            if (!res.ok) throw new Error("Failed to update status");
            setStatus(newStatus);
            toast.success(`Paper status changed to ${newStatus}`);
        } catch (e) {
            toast.error("Could not update paper status.");
        }
    };

    const currentMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    const isMarksMismatch = currentMarks !== Number(metadata.totalMarks);

    // Grouping logic for Accordion UI
    const groupedQuestions: { type: QuestionType, items: { q: Question, originalIndex: number }[], customHeading?: string, sectionHeading?: string }[] = [];
    questions.forEach((q, index) => {
        const lastGroup = groupedQuestions.length > 0 ? groupedQuestions[groupedQuestions.length - 1] : null;

        let shouldCreateNewGroup = false;

        if (!lastGroup) {
            shouldCreateNewGroup = true;
        } else if (lastGroup.sectionHeading !== q.sectionHeading) {
            shouldCreateNewGroup = true;
        } else if (lastGroup.customHeading && q.customHeading && lastGroup.customHeading === q.customHeading) {
            shouldCreateNewGroup = false;
        } else if (lastGroup.type !== q.type) {
            shouldCreateNewGroup = true;
        } else if (lastGroup.customHeading !== q.customHeading) {
            shouldCreateNewGroup = true;
        }

        if (shouldCreateNewGroup) {
            groupedQuestions.push({ type: q.type, items: [{ q, originalIndex: index }], customHeading: q.customHeading, sectionHeading: q.sectionHeading });
        } else {
            lastGroup!.items.push({ q, originalIndex: index });
        }
    });

    // Pagination Logic for Live Preview
    useLayoutEffect(() => {
        if (!questionsContainerRef.current) return;

        const container = questionsContainerRef.current;
        const qElements = Array.from(container.children) as HTMLElement[];

        // A4 height at 96dpi is ~1122px. With 10mm top + 10mm bottom padding (~38px each = 76px total),
        // the available content height is ~1046px. We set 1040px to stay just within that with a 6px safety margin.
        const PAGE_HEIGHT_LIMIT = 1040;

        // Measure Page 1 Header Height
        let headerHeight = 0;
        if (headerContainerRef.current) {
            headerHeight = headerContainerRef.current.offsetHeight + 24; // Including mb-6 margin
        }

        const newPages: Question[][] = [[]];
        let currentPageIndex = 0;
        // First page starts with currentHeight = headerHeight
        let currentHeight = headerHeight;

        questions.forEach((q, i) => {
            const el = qElements[i];
            if (!el) return;

            // el.offsetHeight already includes the header if isNewSection is true,
            // because the header is rendered inside 'el'.
            const elementHeight = el.offsetHeight + 8; // +8px for mb-2 margin

            if (currentHeight + elementHeight > PAGE_HEIGHT_LIMIT && newPages[currentPageIndex].length > 0) {
                // Node pushes us over the limit, create a new page
                newPages.push([q]);
                currentPageIndex++;
                currentHeight = elementHeight; // New pages don't have the global header
            } else {
                newPages[currentPageIndex].push(q);
                currentHeight += elementHeight;
            }
        });

        // Remove any empty pages the algorithm may have generated at boundaries,
        // then guarantee at least one page always exists
        const filteredPages = newPages.filter(p => p.length > 0);
        setPages(filteredPages.length > 0 ? filteredPages : [[]]);
    }, [
        questions,
        metadata.showStudentInfo,
        metadata.instructions,
        metadata.schoolName,
        metadata.examName,
        metadata.subject,
        metadata.showAnswerLines,
        metadata.showAnswers,
        metadata.isDyslexiaFriendly,
        metadata.headerTemplate,
        metadata.schoolLogoWidth,
        metadata.schoolLogoHeight,
        fontsLoaded
    ]);

    return (
        <div className="flex flex-col lg:flex-row lg:h-screen overflow-hidden bg-gray-100 print:block print:h-auto print:overflow-visible print:bg-white">
            <AILoadingOverlay isVisible={isParsing} />

            {/* Mobile Tab Bar */}
            <div className="lg:hidden sticky top-0 z-30 flex bg-white border-b border-gray-200 print:hidden">
                <button
                    onClick={() => setMobileTab('build')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${mobileTab === 'build'
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Pencil className="w-4 h-4" /> Build
                </button>
                <button
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${mobileTab === 'preview'
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Eye className="w-4 h-4" /> Preview
                </button>
            </div>

            {/* Left Pane - Builder Controls */}
            <div className={`${mobileTab === 'preview' ? 'hidden' : 'flex'
                } lg:flex w-full lg:w-1/2 flex-col border-r border-gray-300 bg-white print:hidden`}>
                <div className="flex-1 overflow-y-auto p-6 pb-40">
                    <div className="space-y-8">
                        {/* Phase B: Step 1 - Metadata */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex justify-center items-center text-sm">1</span>
                                Paper Details
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>School/Institution Name</Label>
                                    <Input name="schoolName" value={metadata.schoolName} onChange={handleMetadataChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex justify-between items-center">
                                        <span>School Logo (Optional)</span>
                                        {metadata.schoolLogo && (
                                            <Button variant="ghost" size="sm" className="h-4 p-0 text-red-500 hover:text-red-700 hover:bg-transparent" onClick={() => setMetadata(prev => ({ ...prev, schoolLogo: undefined }))}>Remove</Button>
                                        )}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-md p-2 hover:bg-gray-50 transition-colors text-sm text-gray-500">
                                            <Upload className="w-4 h-4" />
                                            {metadata.schoolLogo ? 'Change Logo' : 'Upload Logo'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            const dataUrl = reader.result as string;
                                                            const img = new window.Image();
                                                            img.onload = () => {
                                                                let w = img.width;
                                                                let h = img.height;
                                                                if (w > 80) {
                                                                    h = Math.round((80 / w) * h);
                                                                    w = 80;
                                                                }
                                                                setMetadata(prev => ({ ...prev, schoolLogo: dataUrl, schoolLogoWidth: w, schoolLogoHeight: h, schoolLogoAlignment: 'center' }));
                                                            };
                                                            img.src = dataUrl;
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {metadata.schoolLogo && (
                                            <img src={metadata.schoolLogo} alt="Logo" className="h-10 w-10 object-contain rounded border" />
                                        )}
                                    </div>
                                    {metadata.schoolLogo && (
                                        <div className="flex flex-col gap-2 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                                            <div className="text-xs font-semibold text-gray-500">Logo Alignment & Size</div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${metadata.schoolLogoAlignment === 'left' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500 hover:text-indigo-700'}`} onClick={(e) => { e.preventDefault(); setMetadata(prev => ({ ...prev, schoolLogoAlignment: 'left' })); }}>
                                                        <AlignLeft className="w-3 h-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${!metadata.schoolLogoAlignment || metadata.schoolLogoAlignment === 'center' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500 hover:text-indigo-700'}`} onClick={(e) => { e.preventDefault(); setMetadata(prev => ({ ...prev, schoolLogoAlignment: 'center' })); }}>
                                                        <AlignCenter className="w-3 h-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${metadata.schoolLogoAlignment === 'right' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500 hover:text-indigo-700'}`} onClick={(e) => { e.preventDefault(); setMetadata(prev => ({ ...prev, schoolLogoAlignment: 'right' })); }}>
                                                        <AlignRight className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-indigo-700" onClick={(e) => {
                                                        e.preventDefault();
                                                        const currentW = metadata.schoolLogoWidth || 80;
                                                        const currentH = metadata.schoolLogoHeight || 80;
                                                        const ratio = currentH / currentW;
                                                        const newW = Math.max(20, currentW - 10);
                                                        setMetadata(prev => ({ ...prev, schoolLogoWidth: newW, schoolLogoHeight: Math.round(newW * ratio) }));
                                                    }}>
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="text-[10px] text-gray-600 w-8 text-center">{metadata.schoolLogoWidth || 80}px</span>
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-indigo-700" onClick={(e) => {
                                                        e.preventDefault();
                                                        const currentW = metadata.schoolLogoWidth || 80;
                                                        const currentH = metadata.schoolLogoHeight || 80;
                                                        const ratio = currentH / currentW;
                                                        const newW = Math.min(300, currentW + 10);
                                                        setMetadata(prev => ({ ...prev, schoolLogoWidth: newW, schoolLogoHeight: Math.round(newW * ratio) }));
                                                    }}>
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Exam/Test Name</Label>
                                    <Input name="examName" value={metadata.examName} onChange={handleMetadataChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Subject</Label>
                                    <Input name="subject" value={metadata.subject} onChange={handleMetadataChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" name="date" value={metadata.date} onChange={handleMetadataChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Marks</Label>
                                    <Input type="number" name="totalMarks" value={metadata.totalMarks} onChange={handleMetadataChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Standard / Class</Label>
                                    <Input name="standard" value={metadata.standard} onChange={handleMetadataChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time Allowed</Label>
                                    <Input name="timeAllowed" value={metadata.timeAllowed} onChange={handleMetadataChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time Limit (Minutes)</Label>
                                    <Input type="number" min="0" name="timeLimit" value={metadata.timeLimit || ""} onChange={handleMetadataChange} placeholder="e.g. 60 for 1 hr" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Instructions (Optional)</Label>
                                    <Input name="instructions" value={metadata.instructions} onChange={handleMetadataChange} />
                                </div>
                                <div className="col-span-2 flex items-center space-x-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="studentInfoCheckbox"
                                        checked={metadata.showStudentInfo}
                                        onChange={(e) => setMetadata({ ...metadata, showStudentInfo: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                    />
                                    <Label htmlFor="studentInfoCheckbox" className="font-medium text-gray-700 cursor-pointer">
                                        Show Student Details Row (Name, Roll No, Div)
                                    </Label>
                                </div>
                                <div className="col-span-2 flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="showAnswerLinesCheckbox"
                                        checked={metadata.showAnswerLines !== false}
                                        onChange={(e) => setMetadata({ ...metadata, showAnswerLines: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                    />
                                    <Label htmlFor="showAnswerLinesCheckbox" className="font-medium text-gray-700 cursor-pointer">
                                        Allocate blank lines for answers on the printed paper
                                    </Label>
                                </div>
                                <div className="col-span-2 flex items-center space-x-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="showAnswersCheckbox"
                                        checked={metadata.showAnswers === true}
                                        onChange={(e) => setMetadata({ ...metadata, showAnswers: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600 cursor-pointer"
                                    />
                                    <Label htmlFor="showAnswersCheckbox" className="font-medium text-gray-700 cursor-pointer">
                                        Show Answers / Key on the printed paper
                                    </Label>
                                </div>
                            </div>
                        </section>

                        {/* Phase 4: Premium Branding & Layout */}
                        <section className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-100">
                            <h2 className="text-lg font-bold mb-4 flex items-center text-amber-900">
                                <Sparkles className="w-5 h-5 mr-2 text-amber-600" /> Premium Branding
                            </h2>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-amber-800 font-semibold block">Header Template Style</Label>
                                    <Select
                                        value={metadata.headerTemplate || 'classic'}
                                        onValueChange={(val: 'classic' | 'modern' | 'ivyleague' | 'minimalist') => setMetadata({ ...metadata, headerTemplate: val })}
                                    >
                                        <SelectTrigger className="w-full bg-white border-amber-200">
                                            <SelectValue placeholder="Select a template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="classic">Classic (Standard Block)</SelectItem>
                                            <SelectItem value="modern">Modern (Asymmetric Space)</SelectItem>
                                            <SelectItem value="ivyleague">Ivy League (Serif & Borders)</SelectItem>
                                            <SelectItem value="minimalist">Minimalist (Clean & Light)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-amber-800 font-semibold flex justify-between items-center">
                                        <span>Background Watermark Logo</span>
                                        {metadata.watermarkImage && (
                                            <Button variant="ghost" size="sm" className="h-4 p-0 text-red-500 hover:text-red-700 hover:bg-transparent" onClick={() => setMetadata(prev => ({ ...prev, watermarkImage: undefined }))}>Remove</Button>
                                        )}
                                    </Label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 border border-dashed border-amber-300 rounded-md p-3 bg-white hover:bg-amber-50 transition-colors text-sm text-amber-700 font-medium">
                                            <Upload className="w-4 h-4" />
                                            {metadata.watermarkImage ? 'Change Watermark' : 'Upload Watermark'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setMetadata(prev => ({ ...prev, watermarkImage: reader.result as string, watermarkOpacity: prev.watermarkOpacity ?? 10 }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {metadata.watermarkImage && (
                                            <div className="h-12 w-12 rounded border border-amber-200 bg-white flex items-center justify-center overflow-hidden">
                                                <img src={metadata.watermarkImage} alt="Watermark" className="max-h-full max-w-full object-contain" />
                                            </div>
                                        )}
                                    </div>

                                    {metadata.watermarkImage && (
                                        <div className="pt-2">
                                            <div className="flex justify-between text-xs text-amber-700 mb-1">
                                                <span>Watermark Opacity</span>
                                                <span className="font-bold">{metadata.watermarkOpacity || 10}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="100"
                                                value={metadata.watermarkOpacity || 10}
                                                onChange={(e) => setMetadata({ ...metadata, watermarkOpacity: Number(e.target.value) })}
                                                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Phase 5: Accessibility Options */}
                        <section className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-100">
                            <h2 className="text-lg font-bold mb-4 flex items-center text-emerald-900">
                                <Sparkles className="w-5 h-5 mr-2 text-emerald-600" /> Accessibility Options
                            </h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="dyslexiaToggle" className="text-emerald-800 font-semibold cursor-pointer">Dyslexia-Friendly Typography</Label>
                                    <p className="text-xs text-emerald-600 mt-1 max-w-[250px]">
                                        Uses the Lexend font, increases spacing, and applies a soft cream background to reduce glare.
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="dyslexiaToggle"
                                        checked={metadata.isDyslexiaFriendly || false}
                                        onChange={(e) => setMetadata({ ...metadata, isDyslexiaFriendly: e.target.checked })}
                                        className="h-6 w-11 rounded-full cursor-pointer appearance-none bg-gray-200 border-2 border-transparent relative transition-colors duration-200 ease-in-out focus:outline-none outline-none ring-offset-2 checked:bg-emerald-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform after:duration-200 after:ease-in-out checked:after:translate-x-5 shadow-sm"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Smart Paste AI Integration */}
                        <section className="bg-gradient-to-r from-indigo-50 to-cyan-50 p-6 rounded-xl border border-indigo-100">
                            <h2 className="text-lg font-bold mb-2 flex items-center text-indigo-900">
                                <Sparkles className="w-5 h-5 mr-2 text-indigo-600" /> Magic OCR & Smart Paste
                            </h2>
                            <p className="text-sm text-indigo-700 mb-4">Paste your raw text, upload a PDF book, upload a Word document, or upload photos of test papers to let our Gemini AI extract and structure the questions automatically.</p>

                            <div className="mb-4">
                                <Label className="text-indigo-800 font-semibold mb-1 block">📄 Chapter / Syllabus PDF</Label>
                                <Input
                                    type="file"
                                    accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    multiple
                                    className="bg-white border-indigo-200 cursor-pointer"
                                    onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                                />
                                {uploadFiles.length > 0 && (
                                    <p className="text-xs text-indigo-500 mt-1">{uploadFiles.length} syllabus file(s) selected</p>
                                )}
                            </div>

                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <Label className="text-amber-800 font-semibold mb-1 block">🎯 Reference Paper Style <span className="font-normal text-amber-600">(Optional — paste a past paper to mimic its format)</span></Label>
                                <Input
                                    type="file"
                                    accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    multiple
                                    className="bg-white border-amber-200 cursor-pointer"
                                    onChange={(e) => setReferenceFiles(Array.from(e.target.files || []))}
                                />
                                {referenceFiles.length > 0 && (
                                    <p className="text-xs text-amber-600 mt-1">✅ {referenceFiles.length} reference paper(s) uploaded — AI will mimic this structure</p>
                                )}
                                {referenceFiles.length === 0 && (
                                    <p className="text-xs text-amber-500 mt-1">No reference paper — AI will use a balanced default structure</p>
                                )}
                            </div>

                            <Label className="text-indigo-800 font-semibold mb-1 block">Instructions / Raw Text</Label>
                            <Textarea
                                placeholder="E.g. Generate 5 MCQs from the attached files... OR paste raw text here."
                                className="bg-white border-indigo-200 mb-3 min-h-[100px]"
                                value={smartPasteText}
                                onChange={(e) => setSmartPasteText(e.target.value)}
                            />
                            
                            <div className="flex gap-2 flex-col sm:flex-row items-end mb-3">
                                <div className="w-full sm:w-1/3">
                                    <Label className="text-indigo-800 font-semibold mb-1 block">Exam Target Marks</Label>
                                    <Input 
                                        type="number" 
                                        value={targetMarks} 
                                        onChange={(e) => setTargetMarks(Number(e.target.value) || 50)} 
                                        className="bg-white border-indigo-200"
                                        min={5}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-2 flex-col sm:flex-row">
                                <Button onClick={handleSmartPaste} disabled={isParsing || isGeneratingExam} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                    {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    {isParsing ? "Extracting..." : "Extract Loose Questions"}
                                </Button>
                                <Button onClick={handleGenerateFullExam} disabled={isParsing || isGeneratingExam} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-700">
                                    {isGeneratingExam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    {isGeneratingExam ? "Writing Exam..." : `Generate ${targetMarks}-Mark Syllabus Exam`}
                                </Button>
                            </div>
                        </section>

                        {/* Phase B: Step 2 - Question Factory */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex justify-center items-center text-sm">2</span>
                                    Question Blocks
                                </h2>

                                {/* Warning Guardrail: Marks Mismatch */}
                                <div className={`px - 3 py - 1 rounded - full text - sm font - semibold border ${isMarksMismatch ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'} `}>
                                    {currentMarks} / {metadata.totalMarks} Marks
                                </div>
                            </div>

                            <div className="space-y-4">
                                {questions.length === 0 && (
                                    <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                                        No questions added yet. Use Smart Paste or add manually below.
                                    </div>
                                )}

                                {groupedQuestions.map((group, groupIndex) => {
                                    const isExpanded = expandedSection === groupIndex;
                                    const groupMarks = group.items.reduce((sum, item) => sum + (Number(item.q.marks) || 0), 0);

                                    const getGroupHeading = (type: string, customHeading?: string) => {
                                        if (customHeading) return customHeading;
                                        switch (type) {
                                            case "MCQ": return "Tick the Correct Option";
                                            case "TF": return "Write T for True and F for False";
                                            case "MATCH": return "Match the Following";
                                            case "SHORT_ANSWER": return "Short question answer";
                                            case "LONG_ANSWER": return "Long question answer";
                                            case "DESCRIPTIVE": return "Answer the following in detail";
                                            case "MAP": return "Mark the following places on the map";
                                            case "FILL_IN_THE_BLANKS": return "Fill in the Blanks";
                                            case "DATA_TABLE": return "Analyze the Table and Answer";
                                            case "CUSTOM": return "Custom Questions";
                                            default: return "Questions";
                                        }
                                    };

                                    return (
                                        <div key={groupIndex} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-300">
                                            {/* Accordion Header */}
                                            <button
                                                onClick={() => setExpandedSection(isExpanded ? -1 : groupIndex)}
                                                className={`w-full flex items-center justify-between p-4 transition-colors ${isExpanded ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1 rounded ${isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {/* Simple chevron via SVG */}
                                                        <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="font-bold text-gray-800 text-left">
                                                        Section {groupIndex + 1}: {getGroupHeading(group.type, group.customHeading)}
                                                    </h3>
                                                    <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-500">
                                                        {group.items.length} items
                                                    </span>
                                                </div>
                                                <div className="font-bold text-sm text-indigo-600 whitespace-nowrap">
                                                    [{groupMarks} Marks]
                                                </div>
                                            </button>

                                            {/* Accordion Body */}
                                            {isExpanded && (
                                                <div className="p-4 space-y-4 bg-gray-50/50">
                                                    {group.items.map(({ q, originalIndex }, innerIndex) => (
                                                        <Card key={q.id} className="relative overflow-hidden group">
                                                            {/* Decorative side bar */}
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400" />

                                                            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-medium text-gray-500">Global #{originalIndex + 1}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <>
                                                                        <div className="flex items-center gap-1 text-sm bg-indigo-50 px-2 py-1 rounded text-indigo-700">
                                                                            <Input
                                                                                type="number"
                                                                                value={q.marks}
                                                                                onChange={(e) => updateQuestion(q.id, { marks: Number(e.target.value) })}
                                                                                className="w-12 h-6 p-1 text-xs text-center font-bold"
                                                                            />
                                                                            <span className="font-semibold text-xs">marks</span>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-1 px-2 border-r border-gray-200 mr-1">
                                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Make optional (OR)</span>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={q.hasOr || false}
                                                                                    onChange={(e) => updateQuestion(q.id, { hasOr: e.target.checked })}
                                                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                                                />
                                                                            </label>
                                                                        </div>
                                                                    </>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeQuestion(q.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </CardHeader>


                                                            <CardContent className="px-4 pb-4">
                                                                {/* General Question Content Input */}
                                                                {q.type !== "MATCH" && (
                                                                    <div className="mb-3 flex flex-col gap-2">
                                                                        <Label>Question Content</Label>
                                                                        <Textarea
                                                                            placeholder="Enter question text here..."
                                                                            value={q.content.questionText || ""}
                                                                            onChange={(e) => updateQuestion(q.id, { content: { ...q.content, questionText: e.target.value } })}
                                                                            className="resize-none"
                                                                            rows={2}
                                                                        />
                                                                        <div className="flex items-center gap-4 mt-1">
                                                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100 transition-colors w-fit">
                                                                                <Upload className="w-4 h-4" />
                                                                                <span className="font-medium">{q.imageUrl ? 'Change Image' : 'Add Image'}</span>
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    className="hidden"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file) {
                                                                                            const reader = new FileReader();
                                                                                            reader.onloadend = () => {
                                                                                                const dataUrl = reader.result as string;
                                                                                                const img = new window.Image();
                                                                                                img.onload = () => {
                                                                                                    let w = img.width;
                                                                                                    let h = img.height;
                                                                                                    if (w > 400) {
                                                                                                        h = Math.round((400 / w) * h);
                                                                                                        w = 400;
                                                                                                    }
                                                                                                    updateQuestion(q.id, { imageUrl: dataUrl, imageWidth: w, imageHeight: h });
                                                                                                };
                                                                                                img.src = dataUrl;
                                                                                            };
                                                                                            reader.readAsDataURL(file);
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </label>
                                                                            {q.imageUrl && (
                                                                                <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-md border border-green-100 flex-wrap">
                                                                                    <ImageIcon className="w-4 h-4 text-green-600" />
                                                                                    <span className="text-xs text-green-700 font-medium truncate max-w-[150px]">Image attached</span>

                                                                                    {/* Alignment Controls */}
                                                                                    <div className="flex items-center gap-1 border-l border-green-200 pl-2 ml-1">
                                                                                        <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${q.imageAlignment === 'left' ? 'bg-green-200 text-green-800' : 'text-gray-500 hover:text-green-700'}`} onClick={(e) => { e.preventDefault(); updateQuestion(q.id, { imageAlignment: 'left' }); }}>
                                                                                            <AlignLeft className="w-3 h-3" />
                                                                                        </Button>
                                                                                        <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${!q.imageAlignment || q.imageAlignment === 'center' ? 'bg-green-200 text-green-800' : 'text-gray-500 hover:text-green-700'}`} onClick={(e) => { e.preventDefault(); updateQuestion(q.id, { imageAlignment: 'center' }); }}>
                                                                                            <AlignCenter className="w-3 h-3" />
                                                                                        </Button>
                                                                                        <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${q.imageAlignment === 'right' ? 'bg-green-200 text-green-800' : 'text-gray-500 hover:text-green-700'}`} onClick={(e) => { e.preventDefault(); updateQuestion(q.id, { imageAlignment: 'right' }); }}>
                                                                                            <AlignRight className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </div>

                                                                                    {/* Size Controls */}
                                                                                    <div className="flex items-center gap-1 border-l border-green-200 pl-2 ml-1">
                                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-green-700" onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            const currentW = q.imageWidth || 400;
                                                                                            const currentH = q.imageHeight || 400;
                                                                                            const ratio = currentH / currentW;
                                                                                            const newW = Math.max(50, currentW - 25);
                                                                                            updateQuestion(q.id, { imageWidth: newW, imageHeight: Math.round(newW * ratio) });
                                                                                        }}>
                                                                                            <Minus className="w-3 h-3" />
                                                                                        </Button>
                                                                                        <span className="text-[10px] text-gray-600 w-8 text-center">{q.imageWidth || 400}px</span>
                                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-green-700" onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            const currentW = q.imageWidth || 400;
                                                                                            const currentH = q.imageHeight || 400;
                                                                                            const ratio = currentH / currentW;
                                                                                            const newW = Math.min(800, currentW + 25);
                                                                                            updateQuestion(q.id, { imageWidth: newW, imageHeight: Math.round(newW * ratio) });
                                                                                        }}>
                                                                                            <Plus className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </div>

                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-1 border-l border-green-200 pl-2 rounded-none"
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            updateQuestion(q.id, { imageUrl: undefined });
                                                                                        }}
                                                                                    >
                                                                                        <XCircle className="w-4 h-4 ml-2" />
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Contextual Render for Question Types */}
                                                                {q.type === "MCQ" && (
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {(q.content.options || ["", "", "", ""]).map((opt: string, optIndex: number) => (
                                                                            <div key={optIndex} className={`flex items-center gap-2 p-2 rounded border ${q.content.correctIndex === optIndex ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`mcq-editor-${q.id}`}
                                                                                    checked={q.content.correctIndex === optIndex}
                                                                                    onChange={() => updateQuestion(q.id, { content: { ...q.content, correctIndex: optIndex } })}
                                                                                    className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                                                                                    title="Set as correct answer"
                                                                                />
                                                                                <span className={`text-sm font-semibold flex items-center ${q.content.correctIndex === optIndex ? 'text-green-700' : 'text-gray-400'}`}>{String.fromCharCode(65 + optIndex)})</span>
                                                                                <Input
                                                                                    value={opt}
                                                                                    className={`h-8 text-sm border-none bg-transparent focus-visible:ring-0 shadow-none px-1 ${q.content.correctIndex === optIndex ? 'text-green-900 font-medium' : ''}`}
                                                                                    placeholder={`Option ${optIndex + 1} `}
                                                                                    onChange={(e) => {
                                                                                        const newOpts = [...q.content.options];
                                                                                        newOpts[optIndex] = e.target.value;
                                                                                        updateQuestion(q.id, { content: { ...q.content, options: newOpts } });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {q.type === "TF" && (
                                                                    <div className="flex gap-4">
                                                                        <label className="flex items-center gap-2">
                                                                            <input type="radio" checked={q.content.isTrue === true} onChange={() => updateQuestion(q.id, { content: { ...q.content, isTrue: true } })} /> True
                                                                        </label>
                                                                        <label className="flex items-center gap-2">
                                                                            <input type="radio" checked={q.content.isTrue === false} onChange={() => updateQuestion(q.id, { content: { ...q.content, isTrue: false } })} /> False
                                                                        </label>
                                                                    </div>
                                                                )}

                                                                {q.type === "MATCH" && (
                                                                    <div className="space-y-2 mt-4">
                                                                        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                                                                            <span className="w-1/2">Column A</span>
                                                                            <span className="w-1/2 pl-4">Column B</span>
                                                                        </div>
                                                                        {(q.content.pairs || []).map((pair: any, pIndex: number) => (
                                                                            <div key={pIndex} className="flex gap-2 items-center">
                                                                                <div className="flex-1 flex items-center gap-2">
                                                                                    <span className="text-xs font-bold text-gray-400 w-4">{pIndex + 1}.</span>
                                                                                    <Input
                                                                                        className="flex-1 text-sm h-8"
                                                                                        placeholder="Item"
                                                                                        value={pair.left}
                                                                                        onChange={(e) => {
                                                                                            const newPairs = [...(q.content.pairs || [])];
                                                                                            newPairs[pIndex] = { ...newPairs[pIndex], left: e.target.value };
                                                                                            updateQuestion(q.id, { content: { ...q.content, pairs: newPairs } });
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex-1 flex items-center gap-2">
                                                                                    <span className="text-xs font-bold text-gray-400 w-4">({String.fromCharCode(97 + pIndex)})</span>
                                                                                    <Input
                                                                                        className="flex-1 text-sm h-8"
                                                                                        placeholder="Match"
                                                                                        value={pair.right}
                                                                                        onChange={(e) => {
                                                                                            const newPairs = [...(q.content.pairs || [])];
                                                                                            newPairs[pIndex] = { ...newPairs[pIndex], right: e.target.value };
                                                                                            updateQuestion(q.id, { content: { ...q.content, pairs: newPairs } });
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                                                                                    onClick={() => {
                                                                                        const newPairs = (q.content.pairs || []).filter((_: any, i: number) => i !== pIndex);
                                                                                        updateQuestion(q.id, { content: { ...q.content, pairs: newPairs } });
                                                                                    }}
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        ))}
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="w-full mt-2 h-8 text-xs border-dashed text-gray-500"
                                                                            onClick={() => {
                                                                                const newPairs = [...(q.content.pairs || []), { left: "", right: "" }];
                                                                                updateQuestion(q.id, { content: { ...q.content, pairs: newPairs } });
                                                                            }}
                                                                        >
                                                                            <Plus className="w-3 h-3 mr-1" /> Add Pair
                                                                        </Button>
                                                                    </div>
                                                                )}

                                                                {(q.type === "DESCRIPTIVE" || q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER" || q.type === "CUSTOM") && (q.content.linesRequired ?? 0) > 0 && (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                                                        Lines to allocate for answer:
                                                                        <Input type="number" min={0} className="w-16 h-8 p-1" value={q.content.linesRequired ?? 5} onChange={(e) => updateQuestion(q.id, { content: { ...q.content, linesRequired: Number(e.target.value) } })} />
                                                                    </div>
                                                                )}

                                                                {q.type === "DATA_TABLE" && (
                                                                    <div className="space-y-4 mt-4">
                                                                        <div className="border border-gray-200 rounded-md overflow-hidden">
                                                                            <div className="bg-gray-50 p-2 flex gap-2 border-b border-gray-200">
                                                                                <Button variant="outline" size="sm" onClick={() => {
                                                                                    const newTable = [...q.content.tableData];
                                                                                    const cols = newTable[0]?.length || 2;
                                                                                    newTable.push(Array(cols).fill(""));
                                                                                    updateQuestion(q.id, { content: { ...q.content, tableData: newTable } });
                                                                                }}><Plus className="w-3 h-3 mr-1" /> Add Row</Button>
                                                                                <Button variant="outline" size="sm" onClick={() => {
                                                                                    const newTable = q.content.tableData.map((row: string[]) => [...row, ""]);
                                                                                    updateQuestion(q.id, { content: { ...q.content, tableData: newTable } });
                                                                                }}><Plus className="w-3 h-3 mr-1" /> Add Column</Button>
                                                                            </div>
                                                                            <div className="p-4 overflow-x-auto">
                                                                                <table className="w-full border-collapse">
                                                                                    <tbody>
                                                                                        {(q.content.tableData || []).map((row: string[], rIndex: number) => (
                                                                                            <tr key={rIndex}>
                                                                                                {row.map((cell: string, cIndex: number) => (
                                                                                                    <td key={cIndex} className="border border-gray-300 p-1 relative group">
                                                                                                        <div className="flex items-center gap-1">
                                                                                                            <Input
                                                                                                                className="h-8 text-sm border-none shadow-none focus-visible:ring-1 focus-visible:ring-indigo-300 bg-transparent"
                                                                                                                value={cell}
                                                                                                                placeholder={`R${rIndex + 1} C${cIndex + 1}`}
                                                                                                                onChange={(e) => {
                                                                                                                    const newTable = [...q.content.tableData];
                                                                                                                    newTable[rIndex] = [...newTable[rIndex]];
                                                                                                                    newTable[rIndex][cIndex] = e.target.value;
                                                                                                                    updateQuestion(q.id, { content: { ...q.content, tableData: newTable } });
                                                                                                                }}
                                                                                                            />
                                                                                                            {cIndex === row.length - 1 && rIndex === 0 && row.length > 1 && (
                                                                                                                <button onClick={() => {
                                                                                                                    const newTable = q.content.tableData.map((r: string[]) => r.filter((_, i) => i !== cIndex));
                                                                                                                    updateQuestion(q.id, { content: { ...q.content, tableData: newTable } });
                                                                                                                }} className="text-red-400 hover:text-red-600 px-1"><Trash2 className="w-3 h-3" /></button>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </td>
                                                                                                ))}
                                                                                                {rIndex > 0 && (
                                                                                                    <td className="w-8 text-center border border-transparent">
                                                                                                        <button onClick={() => {
                                                                                                            const newTable = q.content.tableData.filter((_: any, i: number) => i !== rIndex);
                                                                                                            updateQuestion(q.id, { content: { ...q.content, tableData: newTable } });
                                                                                                        }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                                                                                    </td>
                                                                                                )}
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 border-t pt-4">Optional: Add Multiple Choice Options Below Table</div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {(q.content.options || ["", "", "", ""]).map((opt: string, optIndex: number) => (
                                                                                <div key={optIndex} className={`flex items-center gap-2 p-2 rounded border ${q.content.correctIndex === optIndex ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`table-mcq-editor-${q.id}`}
                                                                                        checked={q.content.correctIndex === optIndex}
                                                                                        onChange={() => updateQuestion(q.id, { content: { ...q.content, correctIndex: optIndex } })}
                                                                                        className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                                                                                        title="Set as correct answer"
                                                                                    />
                                                                                    <span className={`text-sm font-semibold flex items-center ${q.content.correctIndex === optIndex ? 'text-green-700' : 'text-gray-400'}`}>{String.fromCharCode(65 + optIndex)})</span>
                                                                                    <Input
                                                                                        value={opt}
                                                                                        className={`h-8 text-sm border-none bg-transparent focus-visible:ring-0 shadow-none px-1 ${q.content.correctIndex === optIndex ? 'text-green-900 font-medium' : ''}`}
                                                                                        placeholder={`Option ${optIndex + 1}`}
                                                                                        onChange={(e) => {
                                                                                            const newOpts = [...(q.content.options || ["", "", "", ""])];
                                                                                            newOpts[optIndex] = e.target.value;
                                                                                            updateQuestion(q.id, { content: { ...q.content, options: newOpts } });
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    ))}

                                                    {/* Add Question to this specific section */}
                                                    <div className="flex justify-center pt-2 gap-2 flex-col items-center">
                                                        <div className="w-full max-w-sm flex gap-2">
                                                            <div className="flex-1">
                                                                <Label className="text-[10px] uppercase font-bold text-gray-500 mb-1 ml-1" title="The overarching centered title (e.g. Section A)">Section Heading (Centered)</Label>
                                                                <Textarea
                                                                    placeholder="e.g. Section A"
                                                                    className="text-sm font-semibold bg-gray-50 border-dashed border-gray-300 w-full min-h-[60px]"
                                                                    value={group.sectionHeading || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === "" ? undefined : e.target.value;
                                                                        group.items.forEach(item => updateQuestion(item.q.id, { sectionHeading: val }));
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <Label className="text-[10px] uppercase font-bold text-gray-500 mb-1 ml-1" title="The left-aligned instruction for this block">Question Instruction (Left)</Label>
                                                                <Textarea
                                                                    placeholder="Override default instructions..."
                                                                    className="text-sm font-semibold bg-gray-50 border-dashed border-gray-300 w-full min-h-[60px]"
                                                                    value={group.customHeading || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === "" ? undefined : e.target.value;
                                                                        group.items.forEach(item => updateQuestion(item.q.id, { customHeading: val }));
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 border-dashed w-full max-w-sm mt-2"
                                                            onClick={() => {
                                                                const lastIndex = group.items[group.items.length - 1].originalIndex;
                                                                addQuestion(group.type, lastIndex, group.customHeading, group.sectionHeading);
                                                            }}
                                                        >
                                                            <Plus className="w-4 h-4 mr-2" /> Add Question to this Section
                                                        </Button>

                                                        {/* Inline Add New Block Support */}
                                                        <div className="w-full max-w-sm mt-4 pt-4 border-t border-gray-200 flex flex-col items-center gap-2 pb-2">
                                                            <Label className="text-[10px] uppercase font-bold text-gray-400 w-full text-center tracking-wider">Add New Block Below This Section</Label>
                                                            <div className="flex w-full gap-2">
                                                                <select
                                                                    className="flex-1 h-8 px-2 rounded-md border border-gray-300 bg-white text-xs shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                    value={selectedQuestionType}
                                                                    onChange={(e) => setSelectedQuestionType(e.target.value as QuestionType)}
                                                                >
                                                                    <option value="MCQ">1. Tick the Correct Option</option>
                                                                    <option value="FILL_IN_THE_BLANKS">2. Fill in the Blanks</option>
                                                                    <option value="TF">3. Write T for True and F for False</option>
                                                                    <option value="MATCH">4. Match the Following</option>
                                                                    <option value="SHORT_ANSWER">5. Short question answer</option>
                                                                    <option value="LONG_ANSWER">6. Long question answer</option>
                                                                    <option value="DESCRIPTIVE">7. General Descriptive</option>
                                                                    <option value="MAP">8. Map Question</option>
                                                                    <option value="DATA_TABLE">9. Data Table</option>
                                                                    <option value="CUSTOM">10. Custom (No Layout)</option>
                                                                </select>
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                                                    onClick={() => {
                                                                        const lastIndex = group.items[group.items.length - 1].originalIndex;
                                                                        // No custom heading override, since it's a completely new layout section
                                                                        addQuestion(selectedQuestionType, lastIndex);
                                                                    }}
                                                                >
                                                                    Add Block
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add New Question Block</p>
                                <div className="flex gap-3">
                                    <select
                                        className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                                        value={selectedQuestionType}
                                        onChange={(e) => setSelectedQuestionType(e.target.value as QuestionType)}
                                    >
                                        <option value="MCQ">1. Tick the Correct Option</option>
                                        <option value="FILL_IN_THE_BLANKS">2. Fill in the Blanks</option>
                                        <option value="TF">3. Write T for True and F for False</option>
                                        <option value="MATCH">4. Match the Following</option>
                                        <option value="SHORT_ANSWER">5. Short question answer</option>
                                        <option value="LONG_ANSWER">6. Long question answer</option>
                                        <option value="DESCRIPTIVE">7. General Descriptive</option>
                                        <option value="MAP">8. Map Question</option>
                                        <option value="DATA_TABLE">9. Data Table</option>
                                        <option value="CUSTOM">10. Custom (No Layout)</option>
                                    </select>
                                    <Button
                                        onClick={() => addQuestion(selectedQuestionType)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-6"
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Add Block
                                    </Button>
                                    <Button
                                        onClick={handleShufflePaper}
                                        variant="outline"
                                        className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800 shadow-sm px-6"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" /> Shuffle Existing Questions
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-y-4 hide-on-print">
                    {isMarksMismatch ? (
                        <div className="text-red-500 font-semibold text-sm flex items-center">⚠️ Marks mismatch! Modify to reach {metadata.totalMarks}.</div>
                    ) : (
                        <div className="text-emerald-600 font-semibold text-sm">Perfect marks distribution.</div>
                    )}
                    <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                        {userRole === "TEACHER" && (
                            <>
                                {status === "DRAFT" && (
                                    <>
                                        <Button variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100 hover:text-fuchsia-800 shadow-sm" onClick={handleGenerateVariant} disabled={isParsing}>
                                            {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                            Generate AI Variant
                                        </Button>
                                        <Button variant="outline" className="text-emerald-700 border-emerald-200" onClick={handleSavePaper} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Draft
                                        </Button>
                                        <Button onClick={() => handleStatusChange("PENDING_ADMIN")} className="bg-indigo-600 hover:bg-indigo-700">
                                            <Send className="w-4 h-4 mr-2" /> Submit for Review
                                        </Button>
                                    </>
                                )}
                                {status !== "DRAFT" && (
                                    <div className="text-gray-500 italic mt-2 mr-4">Paper is locked under review.</div>
                                )}
                                <Button className="bg-emerald-600 hover:bg-emerald-700 ml-4" onClick={() => setShowPublishModal(true)}><Globe className="w-4 h-4 mr-2" /> Publish Online</Button>
                            </>
                        )}

                        {userRole === "ADMIN" && (
                            <>
                                <Button variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100 hover:text-fuchsia-800 shadow-sm" onClick={handleGenerateVariant} disabled={isParsing}>
                                    {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Generate AI Variant
                                </Button>
                                <Button variant="outline" onClick={handleSavePaper} disabled={isSaving} className="border-indigo-200 font-semibold shadow-sm">
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </Button>
                                {status === "PENDING_ADMIN" && (
                                    <>
                                        <Button onClick={() => handleStatusChange("REJECTED")} variant="destructive" className="ml-2">
                                            <XCircle className="w-4 h-4 mr-2" /> Reject
                                        </Button>
                                        <Button onClick={() => handleStatusChange("PENDING_SUPERADMIN")} className="bg-emerald-600 hover:bg-emerald-700 ml-2">
                                            <ShieldCheck className="w-4 h-4 mr-2" /> Submit to Super Admin
                                        </Button>
                                        <Button onClick={() => handleStatusChange("APPROVED")} className="bg-indigo-600 hover:bg-indigo-700 ml-2">
                                            <ShieldCheck className="w-4 h-4 mr-2" /> Final Approve (Bypass)
                                        </Button>
                                    </>
                                )}
                                <Button variant="outline" onClick={() => generateAnswerKeyPdf(metadata, questions)} className="ml-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50"><Download className="w-4 h-4 mr-2" /> Answer Key</Button>
                                {questions.some(q => q.type === "MCQ") && (
                                    <Button variant="outline" onClick={() => generateOmrPdf(metadata, questions)} className="ml-4"><Circle className="w-4 h-4 mr-2" /> Export OMR</Button>
                                )}
                                <Button variant="outline" onClick={() => generateDocx(metadata, questions)} className="ml-4"><Download className="w-4 h-4 mr-2" /> Export DOCX</Button>
                                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={generatePdfViaBrowser}><Download className="w-4 h-4 mr-2" /> Print PDF</Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 ml-4" onClick={() => setShowPublishModal(true)}><Globe className="w-4 h-4 mr-2" /> Publish Online</Button>
                            </>
                        )}

                        {userRole === "SUPER_ADMIN" && (
                            <>
                                <Button variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100 hover:text-fuchsia-800 shadow-sm" onClick={handleGenerateVariant} disabled={isParsing}>
                                    {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Generate AI Variant
                                </Button>
                                <Button variant="outline" onClick={handleSavePaper} disabled={isSaving} className="border-indigo-200 font-semibold shadow-sm">
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </Button>
                                {(status === "PENDING_SUPERADMIN" || status === "PENDING_ADMIN") && (
                                    <>
                                        <Button onClick={() => handleStatusChange("REJECTED")} variant="destructive" className="ml-2"><XCircle className="w-4 h-4 mr-2" /> Reject</Button>
                                        <Button onClick={() => handleStatusChange("APPROVED")} className="bg-green-600 hover:bg-green-700 ml-2"><ShieldCheck className="w-4 h-4 mr-2" /> Final Approve</Button>
                                    </>
                                )}
                                <Button variant="outline" onClick={() => generateAnswerKeyPdf(metadata, questions)} className="ml-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50"><Download className="w-4 h-4 mr-2" /> Answer Key</Button>
                                {questions.some(q => q.type === "MCQ") && (
                                    <Button variant="outline" onClick={() => generateOmrPdf(metadata, questions)} className="ml-4"><Circle className="w-4 h-4 mr-2" /> Export OMR</Button>
                                )}
                                <Button variant="outline" onClick={() => generateDocx(metadata, questions)} className="ml-4"><Download className="w-4 h-4 mr-2" /> Export DOCX</Button>
                                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={generatePdfViaBrowser}><Download className="w-4 h-4 mr-2" /> Print PDF</Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 ml-4" onClick={() => setShowPublishModal(true)}><Globe className="w-4 h-4 mr-2" /> Publish Online</Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden Render Container for Height Measurement */}
            {/* CRITICAL: This MUST be a direct child of the root flex div, NOT inside any pane that uses display:none. */}
            {/* display:none on a parent hides ALL descendants, even position:fixed children. */}
            <div
                className={`fixed opacity-0 pointer-events-none bg-white print:hidden ${metadata.isDyslexiaFriendly ? 'dyslexia-mode' : ''}`}
                style={{
                    top: '-9999px',
                    left: '-9999px',
                    width: '210mm',
                    padding: '0 15mm',
                    fontFamily: 'Arial, sans-serif',
                    zIndex: -1
                }}
            >
                <div ref={headerContainerRef}>
                        {/* CLASSIC TEMPLATE (Default) */}
                        {(!metadata.headerTemplate || metadata.headerTemplate === 'classic') && (
                            <div className="border-b-2 border-black pb-2 mb-3">
                                <div className="mb-0">
                                    {metadata.schoolLogo && (
                                        <div className={`w-full flex mb-2 ${metadata.schoolLogoAlignment === 'left' ? 'justify-start' : metadata.schoolLogoAlignment === 'right' ? 'justify-end' : 'justify-center'}`}>
                                            <img src={metadata.schoolLogo} alt="School Logo" style={{ width: metadata.schoolLogoWidth ? `${metadata.schoolLogoWidth}px` : '80px', height: metadata.schoolLogoHeight ? `${metadata.schoolLogoHeight}px` : 'auto' }} className="object-contain" />
                                        </div>
                                    )}
                                    <h1 className="text-2xl font-bold text-center">{metadata.schoolName || "School/Institution Name"}</h1>
                                </div>

                                <div className="grid grid-cols-3 items-center w-full text-[13pt] font-bold mb-1">
                                    <div className="text-left w-full">DATE: {metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}</div>
                                    <div className="text-center w-full uppercase">SUB: - {metadata.subject || '__________'}</div>
                                    <div className="text-right w-full">TOTAL MARKS: {metadata.totalMarks}</div>
                                </div>

                                <div className="grid grid-cols-3 items-center w-full text-[13pt] font-bold">
                                    <div className="text-left w-full uppercase">STD: {metadata.standard || '__________'}</div>
                                    <div className="text-center w-full uppercase">{metadata.examName || '__________'}</div>
                                    <div className="text-right w-full uppercase">TIME: {metadata.timeAllowed || '__________'}</div>
                                </div>

                                {metadata.instructions && (
                                    <div className="text-center mt-3 text-sm italic font-medium">
                                        Instructions: {metadata.instructions}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MODERN TEMPLATE (Asymmetric left aligned) */}
                        {metadata.headerTemplate === 'modern' && (
                            <div className="border-l-4 border-black pl-4 mb-4 mt-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        {metadata.schoolLogo && (
                                            <div className="mb-2">
                                                <img src={metadata.schoolLogo} alt="School Logo" style={{ width: metadata.schoolLogoWidth ? `${metadata.schoolLogoWidth}px` : '60px', height: metadata.schoolLogoHeight ? `${metadata.schoolLogoHeight}px` : 'auto' }} className="object-contain" />
                                            </div>
                                        )}
                                        <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none mb-1">{metadata.schoolName || "Institution Name"}</h1>
                                        <h2 className="text-xl font-bold text-gray-700 tracking-wide uppercase">{metadata.examName || "EXAMINATION"} • {metadata.subject || "SUBJECT"}</h2>
                                    </div>
                                    <div className="text-right text-[11pt] font-semibold text-gray-600 flex flex-col items-end justify-center bg-gray-50 p-3 rounded-lg border border-gray-200 min-w-[200px]">
                                        <div className="flex justify-between w-full border-b border-gray-300 pb-1 mb-1">
                                            <span>Date:</span> <span className="text-black">{metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}</span>
                                        </div>
                                        <div className="flex justify-between w-full border-b border-gray-300 pb-1 mb-1">
                                            <span>Standard:</span> <span className="text-black">{metadata.standard || '__________'}</span>
                                        </div>
                                        <div className="flex justify-between w-full border-b border-gray-300 pb-1 mb-1">
                                            <span>Time:</span> <span className="text-black">{metadata.timeAllowed || '__________'}</span>
                                        </div>
                                        <div className="flex justify-between w-full pt-1">
                                            <span>Marks:</span> <span className="text-black font-bold">{metadata.totalMarks}</span>
                                        </div>
                                    </div>
                                </div>
                                {metadata.instructions && (
                                    <div className="mt-4 text-sm font-medium text-gray-800 bg-gray-100 p-2 border-l-2 border-gray-400">
                                        <span className="font-bold">Instructions:</span> {metadata.instructions}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* IVY LEAGUE TEMPLATE (Serif, elegant borders) */}
                        {metadata.headerTemplate === 'ivyleague' && (
                            <div className="mb-5 mt-2 font-serif">
                                <div className="border-t-[3px] border-b-[3px] border-black py-4 px-2 text-center relative">
                                    {metadata.schoolLogo && (
                                        <div className="absolute top-1/2 left-4 -translate-y-1/2">
                                            <img src={metadata.schoolLogo} alt="School Logo" style={{ width: metadata.schoolLogoWidth ? `${metadata.schoolLogoWidth}px` : '70px', height: metadata.schoolLogoHeight ? `${metadata.schoolLogoHeight}px` : 'auto' }} className="object-contain" />
                                        </div>
                                    )}
                                    <h1 className="text-3xl tracking-[0.15em] font-bold uppercase mb-2">{metadata.schoolName || "INSTITUTION NAME"}</h1>
                                    <h2 className="text-xl italic font-medium mb-1">{metadata.examName || "Examination Paper"} — {metadata.subject || "Subject"}</h2>

                                    <div className="flex justify-center items-center gap-8 mt-4 text-[12pt] font-semibold border-t border-gray-300 pt-2">
                                        <span>Date: {metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}</span>
                                        <span>•</span>
                                        <span>Grade: {metadata.standard || '__________'}</span>
                                        <span>•</span>
                                        <span>Time: {metadata.timeAllowed || '__________'}</span>
                                        <span>•</span>
                                        <span>Marks: {metadata.totalMarks}</span>
                                    </div>
                                </div>
                                {metadata.instructions && (
                                    <div className="text-center mt-3 text-sm italic font-medium border-b border-dashed border-gray-400 pb-3">
                                        Instructions: {metadata.instructions}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MINIMALIST TEMPLATE (Clean, no heavy borders, light grays) */}
                        {metadata.headerTemplate === 'minimalist' && (
                            <div className="mb-6 mt-4 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-4 mb-3">
                                    {metadata.schoolLogo && (
                                        <img src={metadata.schoolLogo} alt="School Logo" style={{ width: metadata.schoolLogoWidth ? `${metadata.schoolLogoWidth}px` : '40px', height: metadata.schoolLogoHeight ? `${metadata.schoolLogoHeight}px` : 'auto' }} className="object-contain opacity-80" />
                                    )}
                                    <h1 className="text-xl font-medium text-gray-500 tracking-wider uppercase">{metadata.schoolName || "Institution Name"}</h1>
                                </div>
                                <h2 className="text-4xl font-light text-black mb-4">{metadata.examName || "Examination"} <span className="text-gray-400 font-thin">|</span> <span className="font-medium text-gray-800">{metadata.subject || "Subject"}</span></h2>

                                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600 font-medium">
                                    <div className="flex items-center gap-2"><span className="text-gray-400">Date</span> <span className="text-black">{metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-gray-400">Class</span> <span className="text-black">{metadata.standard || '__________'}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-gray-400">Time</span> <span className="text-black">{metadata.timeAllowed || '__________'}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-gray-400">Marks</span> <span className="text-black font-bold">{metadata.totalMarks}</span></div>
                                </div>

                                {metadata.instructions && (
                                    <div className="mt-4 text-xs text-gray-500 font-medium flex gap-2">
                                        <span className="uppercase tracking-widest text-[10px] bg-gray-100 px-2 py-1 rounded">Read</span>
                                        <span className="pt-0.5">{metadata.instructions}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User Input Demo Section (Roll no, Name, etc) optional */}
                        {metadata.showStudentInfo && (
                            <div className="flex justify-between text-base mb-6 pb-2 border-b-2 border-dotted border-gray-400 font-medium">
                                <span className="w-1/2">Name: <span className="inline-block w-[80%] border-b border-black"></span></span>
                                <span className="w-1/4">Roll No: <span className="inline-block w-[60%] border-b border-black"></span></span>
                                <span className="w-1/4">Div: <span className="inline-block w-[60%] border-b border-black"></span></span>
                            </div>
                        )}
                    </div>

                    <div ref={questionsContainerRef}>
                        {questions.map((q, i) => {
                            const isSameGroupAsPrev = i > 0 &&
                                questions[i - 1].sectionHeading === q.sectionHeading && (
                                    (questions[i - 1].customHeading && q.customHeading && questions[i - 1].customHeading === q.customHeading) ||
                                    (!q.customHeading && !questions[i - 1].customHeading && questions[i - 1].type === q.type)
                                );
                            const isNewSection = i === 0 || !isSameGroupAsPrev;
                            const isNewSectionHeading = i === 0 || questions[i - 1].sectionHeading !== q.sectionHeading;

                            const getSectionHeading = (type: string, customHeading?: string) => {
                                if (customHeading) return customHeading;
                                switch (type) {
                                    case "MCQ": return "Multiple Choice Questions";
                                    case "TF": return "Write T for True and F for False";
                                    case "MATCH": return "Match the Following";
                                    case "SHORT_ANSWER": return "Short question answer";
                                    case "LONG_ANSWER": return "Long question answer";
                                    case "DESCRIPTIVE": return "Answer the following in detail";
                                    case "MAP": return "Mark the following places on the map";
                                    case "FILL_IN_THE_BLANKS": return "Fill in the Blanks";
                                    case "DATA_TABLE": return "Analyze the Table and Answer";
                                    case "CUSTOM": return "Custom Questions";
                                    default: return "Questions";
                                }
                            };
                            let sectionMarks = 0;
                            if (isNewSection) {
                                for (let j = i; j < questions.length; j++) {
                                    if (questions[j].type === q.type && questions[j].customHeading === q.customHeading && questions[j].sectionHeading === q.sectionHeading) {
                                        sectionMarks += Number(questions[j].marks) || 0;
                                    } else {
                                        break;
                                    }
                                }
                            }

                            let sectionIndex = 1;
                            for (let j = i - 1; j >= 0; j--) {
                                if (questions[j].type === q.type && questions[j].customHeading === q.customHeading && questions[j].sectionHeading === q.sectionHeading) {
                                    sectionIndex++;
                                } else {
                                    break;
                                }
                            }

                            return (
                                <div key={`measure-${q.id}`} className="text-[12pt] leading-tight mb-2">
                                    {isNewSectionHeading && q.sectionHeading && (
                                        <h2 className="text-xl font-bold text-center w-full mb-3 mt-4 uppercase tracking-wide">{q.sectionHeading}</h2>
                                    )}
                                    {isNewSection && (
                                        <h3 className="text-lg mt-2 mb-1 border-b border-gray-300 pb-1 flex justify-between items-start">
                                            <span className="whitespace-pre-wrap">{getSectionHeading(q.type, q.customHeading)}</span>
                                            <span className="whitespace-nowrap ml-4">[{sectionMarks} Marks]</span>
                                        </h3>
                                    )}
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1">
                                            {q.type !== "MATCH" && (
                                                <div className="font-medium">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <p className="text-justify flex-1">
                                                            {!/^\d+[\.\)]/.test((q.content.questionText || "").trim()) && (
                                                                <span className="font-bold mr-1">{q.sequenceOrder}.</span>
                                                            )}
                                                            {q.content.questionText || "__________________________"}
                                                        </p>
                                                        {q.type === "TF" && (
                                                            <span className="font-mono font-bold tracking-widest flex-shrink-0 pt-0.5">[    ]</span>
                                                        )}
                                                    </div>
                                                    {q.imageUrl && (
                                                        <div className={`mt-2 w-full flex ${q.imageAlignment === 'left' ? 'justify-start' : q.imageAlignment === 'right' ? 'justify-end' : 'justify-center'}`}>
                                                            <img
                                                                src={q.imageUrl}
                                                                alt="Question diagram"
                                                                style={{ width: q.imageWidth ? `${q.imageWidth}px` : 'auto', maxHeight: '300px' }}
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {q.type === "MCQ" && (() => {
                                                const longestLength = Math.max(...(q.content.options || []).map((o: string) => o.length));
                                                // Determine columns based on longest string length
                                                let gridClass = "grid-cols-4"; // Default 4 cols
                                                if (longestLength > 40) {
                                                    gridClass = "grid-cols-1";
                                                } else if (longestLength > 18) {
                                                    gridClass = "grid-cols-2";
                                                }

                                                return (
                                                    <div className={`grid ${gridClass} gap-y-1 gap-x-4 mt-1 ml-2 w-full text-[11pt]`}>
                                                        {(q.content.options || []).map((opt: string, optI: number) => {
                                                            const isCorrect = metadata.showAnswers === true && typeof q.content.correctIndex === 'number' && q.content.correctIndex === optI;
                                                            return (
                                                                <div key={optI} className={`flex items-start ${isCorrect ? 'bg-green-50 py-0.5 px-1 -ml-1 rounded' : ''}`}>
                                                                    <span className={`mr-2 whitespace-nowrap ${isCorrect ? 'font-bold text-green-700' : ''}`}>({String.fromCharCode(97 + optI)})</span>
                                                                    <span className={`break-words ${isCorrect ? 'font-bold text-green-700' : ''}`}>{opt}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}

                                            {metadata.showAnswerLines !== false && (q.type === "DESCRIPTIVE" || q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") && (q.content.linesRequired ?? 0) > 0 && (
                                                <div className="mt-2 flex flex-col gap-5 w-full">
                                                    {Array.from({ length: q.content.linesRequired ?? 0 }).map((_, li) => (
                                                        <div key={li} className="border-b border-gray-400 w-full opacity-50"></div>
                                                    ))}
                                                </div>
                                            )}

                                            {q.type === "MATCH" && (
                                                <div className="mt-1 ml-4">
                                                    <table className="w-full max-w-lg text-sm border-collapse">
                                                        <thead>
                                                            <tr>
                                                                <th className="font-bold border-b border-black text-left py-1 w-1/2">Column A</th>
                                                                <th className="font-bold border-b border-black text-left py-1 px-4 w-1/2">Column B</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(q.content.pairs || []).map((pair: any, pIndex: number) => (
                                                                <tr key={pIndex}>
                                                                    <td className="py-1 pr-4">{pIndex + 1}. {pair.left}</td>
                                                                    <td className="py-1 pl-4">({String.fromCharCode(97 + pIndex)}) {pair.right}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {q.type === "DATA_TABLE" && (
                                                <div className="mt-2 text-[11pt]">
                                                    <table className="w-full border-collapse border border-black mb-2">
                                                        <tbody>
                                                            {(q.content.tableData || []).map((row: string[], rIndex: number) => (
                                                                <tr key={rIndex}>
                                                                    {row.map((cell: string, cIndex: number) => (
                                                                        <td key={cIndex} className={`border border-black p-1 px-2 ${rIndex === 0 ? "font-bold text-center" : ""}`}>
                                                                            {cell}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {q.content.options && q.content.options.some((o: string) => o.trim() !== "") && (() => {
                                                        const longestLength = Math.max(...(q.content.options || []).map((o: string) => o.length));
                                                        let gridClass = "grid-cols-4";
                                                        if (longestLength > 40) gridClass = "grid-cols-1";
                                                        else if (longestLength > 18) gridClass = "grid-cols-2";

                                                        return (
                                                            <div className={`grid ${gridClass} gap-y-1 gap-x-4 mt-1 ml-2 w-full text-[11pt]`}>
                                                                {(q.content.options || []).map((opt: string, optI: number) => {
                                                                    const isCorrect = metadata.showAnswers === true && typeof q.content.correctIndex === 'number' && q.content.correctIndex === optI;
                                                                    return opt.trim() !== "" ? (
                                                                        <div key={optI} className={`flex items-start ${isCorrect ? 'bg-green-50 py-0.5 px-1 -ml-1 rounded' : ''}`}>
                                                                            <span className={`mr-2 whitespace-nowrap ${isCorrect ? 'font-bold text-green-700' : ''}`}>({String.fromCharCode(97 + optI)})</span>
                                                                            <span className={`break-words ${isCorrect ? 'font-bold text-green-700' : ''}`}>{opt}</span>
                                                                        </div>
                                                                    ) : null
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            {metadata.showAnswers === true && q.content.solutionText && (
                                                <div className="mt-2 ml-4 p-2 bg-green-50 text-green-800 italic border-l-2 border-green-500 rounded text-[11pt]">
                                                    <span className="font-bold mr-1">Solution:</span>
                                                    {q.content.solutionText}
                                                </div>
                                            )}
                                            {metadata.showAnswers === true && q.type === "TF" && typeof q.content.isTrue === 'boolean' && (
                                                <div className="mt-1 ml-4 text-[11pt] font-bold text-green-700">
                                                    Answer: {q.content.isTrue ? "True" : "False"}
                                                </div>
                                            )}
                                            {metadata.showAnswers === true && q.type === "MCQ" && typeof q.content.correctIndex === 'number' && q.content.options && q.content.options[q.content.correctIndex] && (
                                                <div className="mt-1 ml-4 text-[11pt] font-bold text-green-700">
                                                    Answer: ({String.fromCharCode(97 + q.content.correctIndex)}) {q.content.options[q.content.correctIndex]}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {q.hasOr && (
                                        <div className="w-full text-center mt-3 mb-1 font-bold text-gray-800 text-[11pt] italic">
                                            --- OR ---
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            {/* Right Pane - Phase B: Step 3 (Live A4 Preview) */}
            <div className={`${mobileTab === 'build' ? 'hidden' : 'flex'
                } lg:flex w-full lg:w-1/2 bg-gray-200 overflow-y-auto pt-6 px-4 pb-4 lg:p-8 relative flex-col items-center print:w-full print:bg-white print:p-0 print:overflow-visible print:block`}>
                <h2 className="hidden lg:block absolute top-4 left-6 text-sm font-bold text-gray-400 uppercase tracking-widest bg-gray-200 z-10 hide-on-print">Live A4 Preview</h2>

                <div className="a4-paper-scaler w-full mt-4 lg:mt-8 print:m-0 print:p-0 print:block">
                    <div className="print-area flex flex-col items-center w-full gap-8 print:block print:gap-0 print:space-y-0 print:p-0 print:m-0">
                        {/* Paginated A4 Sheets */}
                        {pages.map((pageQuestions, pageIndex) => (
                            <div
                                key={pageIndex}
                                className={`a4-paper bg-white relative flex-shrink-0 print:shadow-none print:m-0 ${metadata.isDyslexiaFriendly ? 'dyslexia-mode' : ''}`}
                                style={{
                                    width: '210mm',
                                    minHeight: '297mm',
                                    padding: '10mm 15mm',
                                    fontFamily: 'Arial, sans-serif'
                                }}
                            >
                                {/* Watermark Element */}
                                {metadata.watermarkImage && (
                                    <div
                                        className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
                                        style={{
                                            WebkitPrintColorAdjust: "exact",
                                            printColorAdjust: "exact"
                                        }}
                                    >
                                        <img
                                            src={metadata.watermarkImage}
                                            alt=""
                                            className="max-w-[80%] max-h-[80%] object-contain"
                                            style={{
                                                opacity: (metadata.watermarkOpacity || 10) / 100
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Only show Header on the First Page */}
                                {pageIndex === 0 && (
                                    <div className="relative z-10">
                                        {/* CLASSIC TEMPLATE (Default) */}
                                        {(!metadata.headerTemplate || metadata.headerTemplate === 'classic') && (
                                            <div className="border-b-2 border-black pb-2 mb-3">
                                                <div className="mb-0">
                                                    {metadata.schoolLogo && (
                                                        <div className={`w-full flex mb-2 ${metadata.schoolLogoAlignment === 'left' ? 'justify-start' : metadata.schoolLogoAlignment === 'right' ? 'justify-end' : 'justify-center'}`}>
                                                            <img src={metadata.schoolLogo} alt="School Logo" style={{ width: metadata.schoolLogoWidth ? `${metadata.schoolLogoWidth}px` : '80px', height: metadata.schoolLogoHeight ? `${metadata.schoolLogoHeight}px` : 'auto' }} className="object-contain" />
                                                        </div>
                                                    )}
                                                    <h1 className="text-2xl font-bold text-center">{metadata.schoolName || "School/Institution Name"}</h1>
                                                </div>

                                                <div className="grid grid-cols-3 items-center w-full text-[13pt] font-bold mb-1">
                                                    <div className="text-left w-full">DATE: {metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}</div>
                                                    <div className="text-center w-full uppercase">SUB: - {metadata.subject || '__________'}</div>
                                                    <div className="text-right w-full">TOTAL MARKS: {metadata.totalMarks}</div>
                                                </div>

                                                <div className="grid grid-cols-3 items-center w-full text-[13pt] font-bold">
                                                    <div className="text-left w-full uppercase">STD: {metadata.standard || '__________'}</div>
                                                    <div className="text-center w-full uppercase">{metadata.examName || '__________'}</div>
                                                    <div className="text-right w-full uppercase">TIME: {metadata.timeAllowed || '__________'}</div>
                                                </div>

                                                {metadata.instructions && (
                                                    <div className="text-center mt-3 text-sm italic font-medium">
                                                        Instructions: {metadata.instructions}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* MODERN TEMPLATE (Asymmetric left aligned) */}
                                        {metadata.headerTemplate === 'modern' && (
                                            <div className="border-l-4 border-black pl-4 mb-4 mt-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        {metadata.schoolLogo && (
                                                            <div className="mb-2">
                                                                <img src={metadata.schoolLogo} alt="School Logo" style={{ width: metadata.schoolLogoWidth ? `${metadata.schoolLogoWidth}px` : '60px', height: metadata.schoolLogoHeight ? `${metadata.schoolLogoHeight}px` : 'auto' }} className="object-contain" />
                                                            </div>
                                                        )}
                                                        <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none mb-1">{metadata.schoolName || "Institution Name"}</h1>
                                                        <h2 className="text-xl font-bold text-gray-700 tracking-wide uppercase">{metadata.examName || "EXAMINATION"} • {metadata.subject || "SUBJECT"}</h2>
                                                    </div>
                                                    <div className="text-right text-[11pt] font-semibold text-gray-600 flex flex-col items-end justify-center bg-gray-50 p-3 rounded-lg border border-gray-200 min-w-[200px]">
                                                        <div className="flex justify-between w-full border-b border-gray-300 pb-1 mb-1">
                                                            <span>Date:</span> <span className="text-black">{metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}</span>
                                                        </div>
                                                        <div className="flex justify-between w-full border-b border-gray-300 pb-1 mb-1">
                                                            <span>Standard:</span> <span className="text-black">{metadata.standard || '__________'}</span>
                                                        </div>
                                                        <div className="flex justify-between w-full border-b border-gray-300 pb-1 mb-1">
                                                            <span>Time:</span> <span className="text-black">{metadata.timeAllowed || '__________'}</span>
                                                        </div>
                                                        <div className="flex justify-between w-full pt-1">
                                                            <span>Marks:</span> <span className="text-black font-bold">{metadata.totalMarks}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {metadata.instructions && (
                                                    <div className="mt-4 text-sm font-medium text-gray-800 bg-gray-100 p-2 border-l-2 border-gray-400">
                                                        <span className="font-bold">Instructions:</span> {metadata.instructions}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* IVY LEAGUE TEMPLATE (Serif, elegant borders) */}
                                        {metadata.headerTemplate === 'ivyleague' && (
                                            <div className="mb-5 mt-2 font-serif">
                                                <div className="border-t-[3px] border-b-[3px] border-black py-4 px-2 text-center relative">
                                                    {metadata.schoolLogo && (
                                                        <div className="absolute top-1/2 left-4 -translate-y-1/2">
                                                            <img src={metadata.schoolLogo} alt="School Logo" style={{ width: metadata.schoolLogoWidth ? `${metadata.schoolLogoWidth}px` : '70px', height: metadata.schoolLogoHeight ? `${metadata.schoolLogoHeight}px` : 'auto' }} className="object-contain" />
                                                        </div>
                                                    )}
                                                    <h1 className="text-3xl tracking-[0.15em] font-bold uppercase mb-2">{metadata.schoolName || "INSTITUTION NAME"}</h1>
                                                    <h2 className="text-xl italic font-medium mb-1">{metadata.examName || "Examination Paper"} — {metadata.subject || "Subject"}</h2>

                                                    <div className="flex justify-center items-center gap-8 mt-4 text-[12pt] font-semibold border-t border-gray-300 pt-2">
                                                        <span>Date: {metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}</span>
                                                        <span>•</span>
                                                        <span>Grade: {metadata.standard || '__________'}</span>
                                                        <span>•</span>
                                                        <span>Time: {metadata.timeAllowed || '__________'}</span>
                                                        <span>•</span>
                                                        <span>Marks: {metadata.totalMarks}</span>
                                                    </div>
                                                </div>
                                                {metadata.instructions && (
                                                    <div className="text-center mt-3 text-sm italic font-medium border-b border-dashed border-gray-400 pb-3">
                                                        Instructions: {metadata.instructions}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* MINIMALIST TEMPLATE (Clean, no heavy borders, light grays) */}
                                        {metadata.headerTemplate === 'minimalist' && (
                                            <div className="mb-6 mt-4 pb-4 border-b border-gray-200">
                                                <div className="flex items-center gap-4 mb-3">
                                                    {metadata.schoolLogo && (
                                                        <img src={metadata.schoolLogo} alt="School Logo" style={{ width: metadata.schoolLogoWidth ? `${metadata.schoolLogoWidth}px` : '40px', height: metadata.schoolLogoHeight ? `${metadata.schoolLogoHeight}px` : 'auto' }} className="object-contain opacity-80" />
                                                    )}
                                                    <h1 className="text-xl font-medium text-gray-500 tracking-wider uppercase">{metadata.schoolName || "Institution Name"}</h1>
                                                </div>
                                                <h2 className="text-4xl font-light text-black mb-4">{metadata.examName || "Examination"} <span className="text-gray-400 font-thin">|</span> <span className="font-medium text-gray-800">{metadata.subject || "Subject"}</span></h2>

                                                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600 font-medium">
                                                    <div className="flex items-center gap-2"><span className="text-gray-400">Date</span> <span className="text-black">{metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}</span></div>
                                                    <div className="flex items-center gap-2"><span className="text-gray-400">Class</span> <span className="text-black">{metadata.standard || '__________'}</span></div>
                                                    <div className="flex items-center gap-2"><span className="text-gray-400">Time</span> <span className="text-black">{metadata.timeAllowed || '__________'}</span></div>
                                                    <div className="flex items-center gap-2"><span className="text-gray-400">Marks</span> <span className="text-black font-bold">{metadata.totalMarks}</span></div>
                                                </div>

                                                {metadata.instructions && (
                                                    <div className="mt-4 text-xs text-gray-500 font-medium flex gap-2">
                                                        <span className="uppercase tracking-widest text-[10px] bg-gray-100 px-2 py-1 rounded">Read</span>
                                                        <span className="pt-0.5">{metadata.instructions}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Only show Student row on First Page */}
                                        {metadata.showStudentInfo && (
                                            <div className="flex justify-between text-base mb-6 pb-2 border-b-2 border-dotted border-gray-400 font-medium">
                                                <span className="w-1/2">Name: <span className="inline-block w-[80%] border-b border-black"></span></span>
                                                <span className="w-1/4">Roll No: <span className="inline-block w-[60%] border-b border-black"></span></span>
                                                <span className="w-1/4">Div: <span className="inline-block w-[60%] border-b border-black"></span></span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Questions Section for this Page */}
                                <div className="flex-grow">
                                    {pageQuestions.map((q, localIndex) => {
                                        // Find global index to keep numbering continuous
                                        const globalIndex = questions.findIndex(globalQ => globalQ.id === q.id);
                                        if (globalIndex === -1) return null; // Prevent crash before layout effect syncs state

                                        const isSameGroupAsPrev = globalIndex > 0 &&
                                            questions[globalIndex - 1].sectionHeading === q.sectionHeading && (
                                                (questions[globalIndex - 1].customHeading && q.customHeading && questions[globalIndex - 1].customHeading === q.customHeading) ||
                                                (!q.customHeading && !questions[globalIndex - 1].customHeading && questions[globalIndex - 1].type === q.type)
                                            );
                                        const isNewSection = globalIndex === 0 || !isSameGroupAsPrev;
                                        const isNewSectionHeading = globalIndex === 0 || questions[globalIndex - 1].sectionHeading !== q.sectionHeading;

                                        const getSectionHeading = (type: string, customHeading?: string) => {
                                            if (customHeading) return customHeading;
                                            switch (type) {
                                                case "MCQ": return "Multiple Choice Questions";
                                                case "TF": return "Write T for True and F for False";
                                                case "MATCH": return "Match the Following";
                                                case "SHORT_ANSWER": return "Short question answer";
                                                case "LONG_ANSWER": return "Long question answer";
                                                case "DESCRIPTIVE": return "Answer the following in detail";
                                                case "MAP": return "Mark the following places on the map";
                                                case "FILL_IN_THE_BLANKS": return "Fill in the Blanks";
                                                case "DATA_TABLE": return "Analyze the Table and Answer";
                                                case "CUSTOM": return "Custom Questions";
                                                default: return "Questions";
                                            }
                                        };

                                        let sectionMarks = 0;
                                        if (isNewSection) {
                                            for (let j = globalIndex; j < questions.length; j++) {
                                                const isSameGroup =
                                                    questions[j].sectionHeading === q.sectionHeading && (
                                                        (questions[j].customHeading && q.customHeading && questions[j].customHeading === q.customHeading) ||
                                                        (!q.customHeading && !questions[j].customHeading && questions[j].type === q.type));

                                                if (isSameGroup) {
                                                    sectionMarks += Number(questions[j].marks) || 0;
                                                } else {
                                                    break;
                                                }
                                            }
                                        }

                                        let sectionIndex = 1;
                                        for (let j = globalIndex - 1; j >= 0; j--) {
                                            const isSameGroup =
                                                questions[j].sectionHeading === q.sectionHeading && (
                                                    (questions[j].customHeading && q.customHeading && questions[j].customHeading === q.customHeading) ||
                                                    (!q.customHeading && !questions[j].customHeading && questions[j].type === q.type));

                                            if (isSameGroup) {
                                                if (questions[j].type !== "MATCH" && questions[j].type !== "CUSTOM") {
                                                    sectionIndex++;
                                                }
                                            } else {
                                                break;
                                            }
                                        }



                                        return (
                                            <div key={q.id} className="text-[12pt] leading-tight break-inside-avoid mb-2">
                                                {isNewSectionHeading && q.sectionHeading && (
                                                    <h2 className="text-xl font-bold text-center w-full mb-3 mt-4 uppercase tracking-wide">{q.sectionHeading}</h2>
                                                )}
                                                {isNewSection && (
                                                    <h3 className="text-lg mt-2 mb-1 border-b border-gray-300 pb-1 flex justify-between items-start">
                                                        <span className="whitespace-pre-wrap">{getSectionHeading(q.type, q.customHeading)}</span>
                                                        <span className="whitespace-nowrap ml-4">[{sectionMarks} Marks]</span>
                                                    </h3>
                                                )}
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1">
                                                        {q.type !== "MATCH" && (
                                                            <div className="font-medium">
                                                                <div className="flex justify-between items-start gap-4">
                                                                    <p className="text-justify flex-1">
                                                                            {!/^\d+[\.\)]/.test((q.content.questionText || "").trim()) && (
                                                                                <span className="font-bold mr-1">{q.sequenceOrder}.</span>
                                                                            )}
                                                                            <Latex>{q.content.questionText || "__________________________"}</Latex>
                                                                        </p>
                                                                    {q.type === "TF" && (
                                                                        <span className="font-mono font-bold tracking-widest flex-shrink-0 pt-0.5">[    ]</span>
                                                                    )}
                                                                </div>
                                                                {q.imageUrl && (
                                                                    <div className={`mt-2 w-full flex ${q.imageAlignment === 'left' ? 'justify-start' : q.imageAlignment === 'right' ? 'justify-end' : 'justify-center'}`}>
                                                                        <img
                                                                            src={q.imageUrl}
                                                                            alt="Question diagram"
                                                                            style={{ width: q.imageWidth ? `${q.imageWidth}px` : 'auto', maxHeight: '300px' }}
                                                                            className="object-contain"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {q.type === "MCQ" && (() => {
                                                            const longestLength = Math.max(...(q.content.options || []).map((o: string) => o.length));

                                                            // Auto grid calculation based on max word-length to ensure strict vertical columns
                                                            let gridClass = "grid-cols-4";
                                                            if (longestLength > 40) gridClass = "grid-cols-1";
                                                            else if (longestLength > 18) gridClass = "grid-cols-2";

                                                            return (
                                                                <div className={`grid ${gridClass} gap-y-1 gap-x-4 mt-1 ml-2 w-full text-[11pt]`}>
                                                                    {(q.content.options || []).map((opt: string, optI: number) => {
                                                                        const isCorrect = metadata.showAnswers === true && typeof q.content.correctIndex === 'number' && q.content.correctIndex === optI;
                                                                        return (
                                                                            <div key={optI} className={`flex items-start ${isCorrect ? 'bg-green-50 py-0.5 px-1 -ml-1 rounded' : ''}`}>
                                                                                <span className={`mr-2 whitespace-nowrap ${isCorrect ? 'font-bold text-green-700' : ''}`}>({String.fromCharCode(97 + optI)})</span>
                                                                                <span className={`break-words ${isCorrect ? 'font-bold text-green-700' : ''}`}><Latex>{opt}</Latex></span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })()}

                                                        {metadata.showAnswerLines !== false && (q.type === "DESCRIPTIVE" || q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") && (q.content.linesRequired ?? 0) > 0 && (
                                                            <div className="mt-2 flex flex-col gap-5 w-full">
                                                                {Array.from({ length: q.content.linesRequired ?? 0 }).map((_, li) => (
                                                                    <div key={li} className="border-b border-gray-400 w-full opacity-50"></div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {q.type === "MATCH" && (
                                                            <div className="mt-1 ml-4">
                                                                <table className="w-full max-w-lg text-sm border-collapse">
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="font-bold border-b border-black text-left py-1 w-1/2">Column A</th>
                                                                            <th className="font-bold border-b border-black text-left py-1 px-4 w-1/2">Column B</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(q.content.pairs || []).map((pair: any, pIndex: number) => (
                                                                            <tr key={pIndex}>
                                                                                <td className="py-1 pr-4">{pIndex + 1}. <Latex>{String(pair.left)}</Latex></td>
                                                                                <td className="py-1 pl-4">({String.fromCharCode(97 + pIndex)}) <Latex>{String(pair.right)}</Latex></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        {q.type === "DATA_TABLE" && (
                                                            <div className="mt-2 text-[11pt]">
                                                                <table className="w-full border-collapse border border-black mb-2">
                                                                    <tbody>
                                                                        {(q.content.tableData || []).map((row: string[], rIndex: number) => (
                                                                            <tr key={rIndex}>
                                                                                {row.map((cell: string, cIndex: number) => (
                                                                                    <td key={cIndex} className={`border border-black p-1 px-2 ${rIndex === 0 ? "font-bold text-center" : ""}`}>
                                                                                        <Latex>{cell}</Latex>
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                                {q.content.options && q.content.options.some((o: string) => o.trim() !== "") && (() => {
                                                                    const longestLength = Math.max(...(q.content.options || []).map((o: string) => o.length));
                                                                    let gridClass = "grid-cols-4";
                                                                    if (longestLength > 40) gridClass = "grid-cols-1";
                                                                    else if (longestLength > 18) gridClass = "grid-cols-2";

                                                                    return (
                                                                        <div className={`grid ${gridClass} gap-y-1 gap-x-4 mt-1 ml-2 w-full text-[11pt]`}>
                                                                            {(q.content.options || []).map((opt: string, optI: number) => {
                                                                                const isCorrect = metadata.showAnswers === true && typeof q.content.correctIndex === 'number' && q.content.correctIndex === optI;
                                                                                return opt.trim() !== "" ? (
                                                                                    <div key={optI} className={`flex items-start ${isCorrect ? 'bg-green-50 py-0.5 px-1 -ml-1 rounded' : ''}`}>
                                                                                        <span className={`mr-2 whitespace-nowrap ${isCorrect ? 'font-bold text-green-700' : ''}`}>({String.fromCharCode(97 + optI)})</span>
                                                                                        <span className={`break-words ${isCorrect ? 'font-bold text-green-700' : ''}`}>{opt}</span>
                                                                                    </div>
                                                                                ) : null
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                        {metadata.showAnswers === true && q.content.solutionText && (
                                                            <div className="mt-2 ml-4 p-2 bg-green-50 text-green-800 italic border-l-2 border-green-500 rounded text-[11pt]">
                                                                <span className="font-bold mr-1">Solution:</span>
                                                                <Latex>{q.content.solutionText}</Latex>
                                                            </div>
                                                        )}
                                                        {metadata.showAnswers === true && q.type === "TF" && typeof q.content.isTrue === 'boolean' && (
                                                            <div className="mt-1 ml-4 text-[11pt] font-bold text-green-700">
                                                                Answer: {q.content.isTrue ? "True" : "False"}
                                                            </div>
                                                        )}
                                                        {metadata.showAnswers === true && q.type === "MCQ" && typeof q.content.correctIndex === 'number' && q.content.options && q.content.options[q.content.correctIndex] && (
                                                            <div className="mt-1 ml-4 text-[11pt] font-bold text-green-700">
                                                                Answer: ({String.fromCharCode(97 + q.content.correctIndex)}) <Latex>{q.content.options[q.content.correctIndex]}</Latex>
                                                            </div>
                                                        )}

                                                    </div>
                                                </div>
                                                {q.hasOr && (
                                                    <div className="w-full text-center mt-3 mb-1 font-bold text-gray-800 text-[11pt] italic">
                                                        --- OR ---
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Page Footer */}
                                {pageIndex >= 0 && (
                                    <div className="absolute bottom-6 left-0 w-full text-center text-gray-400 text-xs hide-on-print">
                                        - Page {pageIndex + 1} of {pages.length} -
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Publish Online Modal */}
            {showPublishModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold flex items-center"><Globe className="w-5 h-5 mr-2 text-emerald-600" /> Publish Digital Test</h2>
                            <button onClick={() => setShowPublishModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><XCircle className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-gray-600 text-sm">
                                Publishing this exam creates a live web link that students can access from any device. Objective questions (MCQs, True/False) will be automatically graded!
                            </p>
                            
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                                <div>
                                    <div className="font-semibold text-gray-800">Online Status</div>
                                    <div className="text-xs text-gray-500">{metadata.isPublishedOnline ? "Students can take the test" : "Test is offline"}</div>
                                </div>
                                <Button 
                                    onClick={handleTogglePublish} 
                                    disabled={isPublishing || !paperId}
                                    className={`${metadata.isPublishedOnline ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                >
                                    {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : (metadata.isPublishedOnline ? "Take Offline" : "Publish Now")}
                                </Button>
                            </div>

                            {metadata.isPublishedOnline && paperId && (
                                <div className="space-y-2 pt-2 border-t border-gray-200">
                                    <Label>Student Test Link</Label>
                                    <div className="flex gap-2">
                                        <Input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/test/${paperId}`} className="bg-gray-50 font-mono text-sm" />
                                        <Button onClick={handleCopyLink} variant="outline" className="flex-shrink-0">
                                            {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        You can view submissions from the Admin Dashboard or Submissions tab.
                                    </p>
                                    <Button onClick={() => router.push(`/dashboard/submissions/${paperId}`)} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
                                        <Eye className="w-4 h-4 mr-2" /> View Submissions
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BuilderPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
            <BuilderContent />
        </Suspense>
    );
}
