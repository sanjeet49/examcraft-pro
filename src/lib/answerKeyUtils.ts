import { PaperMetadata, Question } from "@/types/builder";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateAnswerKeyPdf = async (metadata: PaperMetadata, questions: Question[]) => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Helper for adding multiline text and tracking Y position
    const addText = (text: string, x: number, y: number, options: any = {}, maxWidth?: number) => {
        const splitText = doc.splitTextToSize(text, maxWidth || (pageWidth - margin * 2));
        doc.text(splitText, x, y, options);
        return y + (splitText.length * 6); // Approximation of height based on 6mm line height
    };

    // 1. School Logo (Optional)
    if (metadata.schoolLogo) {
        try {
            const imgWidth = metadata.schoolLogoWidth ? metadata.schoolLogoWidth * 0.264583 : 20; // Convert px to mm roughly
            const imgHeight = metadata.schoolLogoHeight ? metadata.schoolLogoHeight * 0.264583 : 20;

            let xPos = pageWidth / 2 - imgWidth / 2; // Center default
            if (metadata.schoolLogoAlignment === 'left') xPos = margin;
            if (metadata.schoolLogoAlignment === 'right') xPos = pageWidth - margin - imgWidth;

            doc.addImage(metadata.schoolLogo, 'PNG', xPos, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 8;
        } catch (e) {
            console.error("Failed to add logo to PDF:", e);
        }
    }

    // 2. School Name Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(`ANSWER KEY - ${metadata.schoolName || "School"}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    // 3. Metadata Table Header
    doc.setFontSize(10);
    autoTable(doc, {
        startY: yPos,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1, fontStyle: 'bold' },
        columnStyles: {
            0: { halign: 'left', cellWidth: 50 },
            1: { halign: 'center', cellWidth: 50 },
            2: { halign: 'right', cellWidth: 50 }
        },
        body: [
            [`DATE: ${metadata.date ? new Date(metadata.date).toLocaleDateString() : '__________'}`, `SUB: - ${metadata.subject || '__________'}`, `TOTAL MARKS: ${metadata.totalMarks}`],
            [`STD: ${metadata.standard || '__________'}`, `${metadata.examName || '__________'}`, `TIME: ${metadata.timeAllowed || '__________'}`]
        ],
        margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Draw horizontal line
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // 4. Questions Iteration
    questions.forEach((q, index) => {
        const isSameGroupAsPrev = index > 0 &&
            questions[index - 1].sectionHeading === q.sectionHeading && (
                (questions[index - 1].customHeading && q.customHeading && questions[index - 1].customHeading === q.customHeading) ||
                (!q.customHeading && !questions[index - 1].customHeading && questions[index - 1].type === q.type)
            );
        const isNewSection = index === 0 || !isSameGroupAsPrev;
        const isNewSectionHeading = index === 0 || questions[index - 1].sectionHeading !== q.sectionHeading;

        // Check page break threshold
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        if (isNewSectionHeading && q.sectionHeading) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text(q.sectionHeading.toUpperCase(), pageWidth / 2, yPos + 6, { align: "center" });
            yPos += 14;
        }

        if (isNewSection) {
            // Group markings logic
            let sectionTitle = "Questions";
            let sectionMarks = 0;
            for (let j = index; j < questions.length; j++) {
                const isSameGroup =
                    questions[j].sectionHeading === q.sectionHeading && (
                        (questions[j].customHeading && q.customHeading && questions[j].customHeading === q.customHeading) ||
                        (!q.customHeading && !questions[j].customHeading && questions[j].type === q.type));

                if (isSameGroup) sectionMarks += Number(questions[j].marks) || 0;
                else break;
            }

            if (q.customHeading) {
                sectionTitle = q.customHeading;
            } else {
                switch (q.type) {
                    case "MCQ": sectionTitle = "Multiple Choice Questions"; break;
                    case "TF": sectionTitle = "Write T for True and F for False"; break;
                    case "MATCH": sectionTitle = "Match the Following"; break;
                    case "SHORT_ANSWER": sectionTitle = "Short question answer"; break;
                    case "LONG_ANSWER": sectionTitle = "Long question answer"; break;
                    case "DESCRIPTIVE": sectionTitle = "Answer the following in detail"; break;
                    case "MAP": sectionTitle = "Mark the following places on the map"; break;
                    case "FILL_IN_THE_BLANKS": sectionTitle = "Fill in the Blanks"; break;
                    case "DATA_TABLE": sectionTitle = "Analyze the Table and Answer"; break;
                    case "CUSTOM": sectionTitle = "Custom Questions"; break;
                }
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            yPos = addText(`${sectionTitle} [${sectionMarks} Marks]`, margin, yPos);
            yPos += 2;
        }

        const qt = (q.content.questionText || "").trim();
        const prefix = !/^\d+[\.\)]/.test(qt) && q.type !== "CUSTOM" ? `${q.sequenceOrder}. ` : "";
        const displayQuestionText = prefix + qt;

        // Print Base Question (Except Match matrices)
        if (q.type !== "MATCH" && q.type !== "CUSTOM") {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            yPos = addText(displayQuestionText, margin + 5, yPos, {}, pageWidth - margin * 2 - 5);
        } else if (q.type === "CUSTOM") {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            yPos = addText(displayQuestionText, margin + 5, yPos, {}, pageWidth - margin * 2 - 5);
        }

        // Print Rubrics directly beneath
        doc.setFontSize(10);

        if (q.type === "MCQ" || q.type === "DATA_TABLE") {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 128, 0); // Green
            const ansText = (typeof q.content.correctIndex === 'number' && q.content.options && q.content.options[q.content.correctIndex])
                ? `Answer: (${String.fromCharCode(97 + q.content.correctIndex)}) ${q.content.options[q.content.correctIndex]}`
                : `Answer: [Not Provided]`;
            yPos = addText(ansText, margin + 15, yPos);
            if (q.content.solutionText) {
                doc.setFont("helvetica", "italic");
                yPos = addText(`Solution Note: ${q.content.solutionText}`, margin + 15, yPos);
            }
            doc.setTextColor(0, 0, 0); // Reset black
        }
        else if (q.type === "TF") {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 128, 0);
            const ansText = typeof q.content.isTrue === 'boolean'
                ? `Answer: ${q.content.isTrue ? "True" : "False"}`
                : `Answer: [Not Provided]`;
            yPos = addText(ansText, margin + 15, yPos);
            if (q.content.solutionText) {
                doc.setFont("helvetica", "italic");
                yPos = addText(`Solution Note: ${q.content.solutionText}`, margin + 15, yPos);
            }
            doc.setTextColor(0, 0, 0);
        }
        else if (q.type === "MATCH") {
            doc.setFont("helvetica", "bold");
            yPos = addText(`Mapped Key List:`, margin + 5, yPos);

            doc.setFont("helvetica", "normal");
            const pairs = q.content.pairs || [];
            if (pairs.length > 0) {
                const tableBody = pairs.map((pair: any, pIndex: number) => {
                    return [`${pIndex + 1}. ${pair.left}`, `-->`, `(${String.fromCharCode(97 + pIndex)}) ${pair.right}`];
                });

                autoTable(doc, {
                    startY: yPos,
                    theme: 'plain',
                    styles: { fontSize: 10, cellPadding: 1 },
                    columnStyles: {
                        0: { cellWidth: 60 },
                        1: { cellWidth: 10, halign: 'center' },
                        2: { cellWidth: 60, fontStyle: 'bold', textColor: [0, 128, 0] }
                    },
                    body: tableBody,
                    margin: { left: margin + 15 }
                });
                yPos = (doc as any).lastAutoTable.finalY + 2;
            }
        }
        else {
            if (q.content.solutionText) {
                doc.setFont("helvetica", "italic");
                doc.setTextColor(0, 128, 0); // Green
                yPos = addText(`Solution: ${q.content.solutionText}`, margin + 15, yPos);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0); // Reset
            } else {
                doc.setFont("helvetica", "italic");
                doc.setTextColor(100, 100, 100);
                yPos = addText(`Rubric Hint: Teacher must manually grade this descriptive section. [${q.marks} Marks max]`, margin + 15, yPos);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0); // Reset
            }
        }

        if (q.hasOr) {
            yPos += 2;
            doc.setFont("helvetica", "italic", "bold");
            yPos = addText(`--- OR ---`, pageWidth / 2, yPos, { align: "center" });
            doc.setFont("helvetica", "normal", "normal");
            yPos += 2;
        }

        yPos += 4; // Spacing after question block
    });

    doc.save(`Answer_Key_${metadata.subject}_${metadata.examName}.pdf`);
};
