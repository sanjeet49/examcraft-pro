"use client";

import React from "react";
import { Question } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Minus, Plus, XCircle, Trash2 } from "lucide-react";

interface QuestionEditorProps {
    q: Question;
    updateQuestion: (id: string, updates: Partial<Question>) => void;
}

export default function QuestionEditor({ q, updateQuestion }: QuestionEditorProps) {
    return (
        <div className="w-full">
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
        </div>
    );
}
