import { PaperMetadata, Question } from "@/types/builder";
import { Document, Paragraph, TextRun, Packer, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun } from "docx";
import { saveAs } from "file-saver";

// Generate Word Document
export const generateDocx = async (metadata: PaperMetadata, questions: Question[]) => {
    const doc = new Document({
        styles: metadata.isDyslexiaFriendly ? {
            default: {
                document: {
                    run: {
                        font: "Comic Sans MS",
                    },
                    paragraph: {
                        spacing: {
                            line: 360, // 1.5 spacing
                            before: 100,
                            after: 100
                        }
                    }
                }
            }
        } : undefined,
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 850, // ~15mm in twips
                            right: 850,
                            bottom: 850,
                            left: 850,
                        },
                    },
                },
                children: [
                    // Determine header composition based on template
                    ...(() => {
                        const headerBlocks = [];

                        // CLASSIC TEMPLATE
                        if (!metadata.headerTemplate || metadata.headerTemplate === 'classic') {
                            if (metadata.schoolLogo) {
                                try {
                                    const base64Data = metadata.schoolLogo.split(',')[1];
                                    const binaryString = window.atob(base64Data);
                                    const len = binaryString.length;
                                    const bytes = new Uint8Array(len);
                                    for (let j = 0; j < len; j++) bytes[j] = binaryString.charCodeAt(j);

                                    headerBlocks.push(new Paragraph({
                                        alignment: metadata.schoolLogoAlignment === 'left' ? AlignmentType.LEFT : metadata.schoolLogoAlignment === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER,
                                        children: [
                                            new ImageRun({
                                                type: "png",
                                                data: bytes,
                                                transformation: {
                                                    width: metadata.schoolLogoWidth || 80,
                                                    height: metadata.schoolLogoHeight || 80
                                                }
                                            })
                                        ],
                                        spacing: { before: 0, after: 100 }
                                    }));
                                } catch (e) { }
                            }

                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: metadata.schoolName, bold: true, size: 32 })],
                                spacing: { before: 0, after: 100 }
                            }));

                            headerBlocks.push(new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: {
                                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                },
                                rows: [
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `DATE: ${metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}`, bold: true, size: 24 })] })] }),
                                            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `SUB: - ${metadata.subject?.toUpperCase() || ''}`, bold: true, size: 24 })] })] }),
                                            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `TOTAL MARKS: ${metadata.totalMarks}`, bold: true, size: 24 })] })] }),
                                        ]
                                    }),
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `STD: ${metadata.standard?.toUpperCase() || ''}`, bold: true, size: 24 })] })] }),
                                            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: metadata.examName?.toUpperCase() || '', bold: true, size: 24 })] })] }),
                                            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `TIME: ${metadata.timeAllowed?.toUpperCase() || ''}`, bold: true, size: 24 })] })] }),
                                        ]
                                    })
                                ]
                            }));
                        }
                        // MODERN TEMPLATE
                        else if (metadata.headerTemplate === 'modern') {
                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.LEFT,
                                children: [new TextRun({ text: metadata.schoolName || "Institution Name", bold: true, size: 36 })],
                            }));
                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.LEFT,
                                children: [new TextRun({ text: `${metadata.examName?.toUpperCase() || "EXAMINATION"} • ${metadata.subject?.toUpperCase() || "SUBJECT"}`, bold: true, size: 24, color: "555555" })],
                                spacing: { after: 200 }
                            }));
                            headerBlocks.push(new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: {
                                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                },
                                rows: [
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Date: ${metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}`, size: 24 })] })] }),
                                            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Std: ${metadata.standard || '__________'}`, size: 24 })] })] }),
                                            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Time: ${metadata.timeAllowed || '__________'}`, size: 24 })] })] }),
                                            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Marks: ${metadata.totalMarks}`, bold: true, size: 24 })] })] })
                                        ]
                                    }),
                                ]
                            }));
                        }
                        // IVY LEAGUE TEMPLATE
                        else if (metadata.headerTemplate === 'ivyleague') {
                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: metadata.schoolName?.toUpperCase() || "INSTITUTION NAME", bold: true, size: 36, font: "Times New Roman" })],
                                spacing: { after: 100 }
                            }));
                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: `${metadata.examName || "Examination"} — ${metadata.subject || "Subject"}`, italics: true, size: 28, font: "Times New Roman" })],
                                spacing: { after: 200 }
                            }));

                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.CENTER,
                                border: {
                                    top: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
                                    bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 }
                                },
                                children: [new TextRun({ text: `Date: ${metadata.date ? new Date(metadata.date).toLocaleDateString() : '____'}   •   Grade: ${metadata.standard || '____'}   •   Time: ${metadata.timeAllowed || '____'}   •   Marks: ${metadata.totalMarks}`, bold: true, size: 24, font: "Times New Roman" })],
                                spacing: { before: 100, after: 100 }
                            }));
                        }
                        // MINIMALIST TEMPLATE
                        else if (metadata.headerTemplate === 'minimalist') {
                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.LEFT,
                                children: [new TextRun({ text: metadata.schoolName?.toUpperCase() || "INSTITUTION NAME", size: 24, color: "777777" })],
                                spacing: { after: 50 }
                            }));
                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.LEFT,
                                children: [
                                    new TextRun({ text: `${metadata.examName || "Examination"} `, size: 36 }),
                                    new TextRun({ text: `| ${metadata.subject || "Subject"}`, size: 36, bold: true, color: "333333" })
                                ],
                                spacing: { after: 200 }
                            }));
                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.LEFT,
                                children: [new TextRun({ text: `Date: ${metadata.date ? new Date(metadata.date).toLocaleDateString() : '____'}      Class: ${metadata.standard || '____'}      Time: ${metadata.timeAllowed || '____'}      Marks: ${metadata.totalMarks}`, size: 24, font: "sans-serif" })],
                            }));
                        }

                        if (metadata.instructions) {
                            headerBlocks.push(new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: `Instructions: ${metadata.instructions}`, italics: true })],
                                spacing: { before: 200, after: 100 }
                            }));
                        }

                        return headerBlocks;
                    })(),
                    new Paragraph({ text: "", spacing: { before: 0, after: 0 } }),
                    ...questions.flatMap((q, i) => {
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

                        const children = [];

                        if (isNewSectionHeading && q.sectionHeading) {
                            children.push(new Paragraph({
                                children: [
                                    new TextRun({ text: q.sectionHeading.toUpperCase(), size: 28, bold: true })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 240, after: 120 }
                            }));
                        }

                        if (isNewSection) {
                            let sectionMarks = 0;
                            for (let j = i; j < questions.length; j++) {
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

                            children.push(new Paragraph({
                                children: [
                                    new TextRun({ text: getSectionHeading(q.type, q.customHeading), size: 24 }),
                                    new TextRun({ text: `\t\t[${sectionMarks} Marks]`, size: 24 })
                                ],
                                spacing: { before: 60, after: 60 }
                            }));
                        }

                        let sectionIndex = 1;
                        for (let j = i - 1; j >= 0; j--) {
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

                        const qt = q.content.questionText || "___";
                        const prefix = !/^\d+[\.\)]/.test(qt.trim()) && q.type !== "CUSTOM" ? `${q.sequenceOrder}. ` : "";
                        const displayQuestionText = prefix + qt;

                        if (q.type !== "MATCH" && q.type !== "CUSTOM") {
                            if (q.type === "TF") {
                                children.push(new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    borders: {
                                        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    },
                                    rows: [
                                        new TableRow({
                                            children: [
                                                new TableCell({
                                                    children: [new Paragraph({ children: [new TextRun({ text: displayQuestionText })] })],
                                                    width: { size: 85, type: WidthType.PERCENTAGE },
                                                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                                                }),
                                                new TableCell({
                                                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "[    ]", bold: true, size: 26 })] })],
                                                    width: { size: 15, type: WidthType.PERCENTAGE },
                                                    margins: { top: 0, bottom: 0, left: 0, right: 0 },
                                                    verticalAlign: "bottom"
                                                })
                                            ]
                                        })
                                    ]
                                }));
                            } else {
                                children.push(new Paragraph({
                                    children: [
                                        new TextRun({ text: displayQuestionText }),
                                    ],
                                    spacing: { before: 0, after: 0 }
                                }));
                            }
                        } else if (q.type === "CUSTOM") {
                            children.push(new Paragraph({
                                children: [
                                    new TextRun({ text: displayQuestionText }),
                                ],
                                spacing: { before: 0, after: 0 }
                            }));
                        }

                        if (q.imageUrl && q.imageWidth && q.imageHeight) {
                            try {
                                const base64Data = q.imageUrl.split(',')[1];
                                const binaryString = window.atob(base64Data);
                                const len = binaryString.length;
                                const bytes = new Uint8Array(len);
                                for (let j = 0; j < len; j++) {
                                    bytes[j] = binaryString.charCodeAt(j);
                                }

                                children.push(new Paragraph({
                                    alignment: q.imageAlignment === 'left' ? AlignmentType.LEFT : q.imageAlignment === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER,
                                    children: [
                                        new ImageRun({
                                            type: "png",
                                            data: bytes,
                                            transformation: {
                                                width: q.imageWidth,
                                                height: q.imageHeight
                                            }
                                        })
                                    ],
                                    spacing: { before: 100, after: 100 }
                                }));
                            } catch (e) {
                                console.error("Failed to parse image for export", e);
                            }
                        }

                        if (q.type === "MCQ") {
                            const optionsData = q.content.options || [];
                            const totalChars = optionsData.reduce((acc: number, o: string) => acc + o.length, 0);
                            const hasLongOpt = optionsData.some((o: string) => o.length > 18);
                            const useGrid = totalChars > 45 || hasLongOpt;

                            if (useGrid) {
                                const rows = [];
                                for (let i = 0; i < optionsData.length; i += 2) {
                                    const opt1Text = optionsData[i] ? `(${String.fromCharCode(97 + i)}) ${optionsData[i]}` : "";
                                    const opt1IsCorrect = metadata.showAnswerLines === false && q.content.correctIndex === i;
                                    const opt1Run = new TextRun({ text: opt1Text, bold: opt1IsCorrect, color: opt1IsCorrect ? "008000" : "000000" });

                                    const opt2Text = optionsData[i + 1] ? `(${String.fromCharCode(97 + i + 1)}) ${optionsData[i + 1]}` : "";
                                    const opt2IsCorrect = metadata.showAnswerLines === false && q.content.correctIndex === i + 1;
                                    const opt2Run = new TextRun({ text: opt2Text, bold: opt2IsCorrect, color: opt2IsCorrect ? "008000" : "000000" });

                                    rows.push(
                                        new TableRow({
                                            children: [
                                                new TableCell({ children: [new Paragraph({ children: [opt1Run] })], margins: { left: 300, right: 100 } }),
                                                new TableCell({ children: [new Paragraph({ children: [opt2Run] })], margins: { left: 100, right: 100 } })
                                            ]
                                        })
                                    );
                                }

                                children.push(new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    columnWidths: [4500, 4500],
                                    borders: {
                                        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    },
                                    rows: rows,
                                    margins: { bottom: 100 }
                                }));
                            } else {
                                children.push(new Paragraph({
                                    children: optionsData.map((opt: string, optI: number) => {
                                        const isCorrect = metadata.showAnswerLines === false && q.content.correctIndex === optI;
                                        return new TextRun({
                                            text: `  (${String.fromCharCode(97 + optI)}) ${opt}          `,
                                            bold: isCorrect,
                                            color: isCorrect ? "008000" : "000000"
                                        });
                                    }),
                                    spacing: { before: 0, after: 100 }
                                }));
                            }
                        } else if (q.type === "DESCRIPTIVE" || q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") {
                            if (metadata.showAnswerLines !== false) {
                                const lines = q.content.linesRequired || 5;
                                for (let k = 0; k < lines; k++) {
                                    children.push(new Paragraph({
                                        children: [new TextRun({ text: "" })],
                                        spacing: { before: 200, after: 200 }
                                    }));
                                }
                            }
                        } else if (q.type === "MATCH") {
                            const pairs = q.content.pairs || [];
                            if (pairs.length > 0) {
                                children.push(new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    borders: {
                                        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                    },
                                    rows: [
                                        new TableRow({
                                            children: [
                                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Column A", bold: true })] })] }),
                                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Column B", bold: true })] })] })
                                            ]
                                        }),
                                        ...pairs.map((pair: any, pI: number) => new TableRow({
                                            children: [
                                                new TableCell({ children: [new Paragraph({ text: `${pI + 1}. ${pair.left}` })] }),
                                                new TableCell({ children: [new Paragraph({ text: `(${String.fromCharCode(97 + pI)}) ${pair.right}` })] })
                                            ]
                                        }))
                                    ]
                                }));
                            }
                        } else if (q.type === "DATA_TABLE") {
                            const tableData = q.content.tableData || [];
                            if (tableData.length > 0) {
                                children.push(new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    borders: {
                                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                                    },
                                    rows: tableData.map((row: string[], rIndex: number) => {
                                        return new TableRow({
                                            children: row.map((cell: string) => {
                                                return new TableCell({
                                                    children: [
                                                        new Paragraph({
                                                            alignment: rIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                                                            children: [
                                                                new TextRun({
                                                                    text: cell,
                                                                    bold: rIndex === 0,
                                                                    size: 22
                                                                })
                                                            ]
                                                        })
                                                    ],
                                                    margins: { top: 100, bottom: 100, left: 100, right: 100 }
                                                });
                                            })
                                        });
                                    }),
                                    margins: { bottom: 200 }
                                }));
                            }

                            if (q.content.options && q.content.options.some((o: string) => o.trim() !== "")) {
                                const optionsData = q.content.options;
                                const totalChars = optionsData.reduce((acc: number, o: string) => acc + o.length, 0);
                                const hasLongOpt = optionsData.some((o: string) => o.length > 18);
                                const useGrid = totalChars > 45 || hasLongOpt;

                                if (useGrid) {
                                    const rows = [];
                                    for (let i = 0; i < optionsData.length; i += 2) {
                                        const opt1Text = optionsData[i]?.trim() ? `(${String.fromCharCode(97 + i)}) ${optionsData[i]}` : "";
                                        const opt1IsCorrect = metadata.showAnswerLines === false && q.content.correctIndex === i;
                                        const opt1Run = new TextRun({ text: opt1Text, bold: opt1IsCorrect, color: opt1IsCorrect ? "008000" : "000000" });

                                        const opt2Text = optionsData[i + 1]?.trim() ? `(${String.fromCharCode(97 + i + 1)}) ${optionsData[i + 1]}` : "";
                                        const opt2IsCorrect = metadata.showAnswerLines === false && q.content.correctIndex === i + 1;
                                        const opt2Run = new TextRun({ text: opt2Text, bold: opt2IsCorrect, color: opt2IsCorrect ? "008000" : "000000" });

                                        rows.push(
                                            new TableRow({
                                                children: [
                                                    new TableCell({ children: [new Paragraph({ children: [opt1Run] })], margins: { left: 300, right: 100 } }),
                                                    new TableCell({ children: [new Paragraph({ children: [opt2Run] })], margins: { left: 100, right: 100 } })
                                                ]
                                            })
                                        );
                                    }

                                    children.push(new Table({
                                        width: { size: 100, type: WidthType.PERCENTAGE },
                                        columnWidths: [4500, 4500],
                                        borders: {
                                            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                                        },
                                        rows: rows,
                                        margins: { bottom: 100 }
                                    }));
                                } else {
                                    children.push(new Paragraph({
                                        children: optionsData.map((opt: string, optI: number) => {
                                            if (!opt.trim()) return new TextRun({ text: "" });
                                            const isCorrect = metadata.showAnswerLines === false && q.content.correctIndex === optI;
                                            return new TextRun({
                                                text: `  (${String.fromCharCode(97 + optI)}) ${opt}          `,
                                                bold: isCorrect,
                                                color: isCorrect ? "008000" : "000000"
                                            });
                                        }),
                                        spacing: { before: 0, after: 100 }
                                    }));
                                }
                            }
                        }

                        if (metadata.showAnswerLines === false && q.content.solutionText) {
                            children.push(new Paragraph({
                                children: [
                                    new TextRun({ text: `Solution: ${q.content.solutionText}`, italics: true, color: "008000", bold: true })
                                ],
                                spacing: { before: 100, after: 100 }
                            }));
                        } else if (metadata.showAnswerLines === false && q.type === "TF" && typeof q.content.isTrue === 'boolean') {
                            children.push(new Paragraph({
                                children: [
                                    new TextRun({ text: `Answer: ${q.content.isTrue ? "True" : "False"}`, italics: true, color: "008000", bold: true })
                                ],
                                spacing: { before: 100, after: 100 }
                            }));
                        } else if (metadata.showAnswerLines === false && q.type === "MCQ" && typeof q.content.correctIndex === 'number' && q.content.options && q.content.options[q.content.correctIndex]) {
                            children.push(new Paragraph({
                                children: [
                                    new TextRun({ text: `Answer: (${String.fromCharCode(97 + q.content.correctIndex)}) ${q.content.options[q.content.correctIndex]}`, italics: true, color: "008000", bold: true })
                                ],
                                spacing: { before: 100, after: 100 }
                            }));
                        }

                        if (q.hasOr) {
                            children.push(new Paragraph({
                                children: [
                                    new TextRun({ text: "--- OR ---", bold: true, italics: true, size: 22 })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 100 }
                            }));
                        }

                        return children;
                    }),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${metadata.examName.replace(/\s+/g, '_')}.docx`);
};

// Generate window.print for PDF 
export const generatePdfViaBrowser = () => {
    window.print();
};
