import { PaperMetadata, Question } from "@/types/builder";
import jsPDF from "jspdf";

export const generateOmrPdf = (metadata: PaperMetadata, questions: Question[]) => {
    // 1. Filter only MCQs
    const mcqs = questions.filter(q => q.type === "MCQ");

    if (mcqs.length === 0) {
        alert("There are no Multiple Choice Questions (MCQs) in this paper to generate an OMR sheet for.");
        return;
    }

    // 2. Setup Document (A4 Portrait)
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    // const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const startX = margin;
    let startY = margin;

    // Helper func
    const drawCenterText = (text: string, yPos: number, size: number, isBold: boolean = false) => {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(size);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, yPos);
    };

    // 3. Header Section
    if (metadata.schoolName) {
        drawCenterText(metadata.schoolName.toUpperCase(), startY + 5, 18, true);
        startY += 12;
    } else {
        drawCenterText("OMR ANSWER SHEET", startY + 5, 18, true);
        startY += 12;
    }

    const subtitle = `${metadata.examName || "Examination"} - ${metadata.subject || "Subject"}`;
    drawCenterText(subtitle, startY, 12, true);
    startY += 10;

    // 4. Student Info Grid
    doc.setLineWidth(0.3);
    doc.rect(startX, startY, pageWidth - (margin * 2), 25);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Name:", startX + 5, startY + 8);
    doc.line(startX + 20, startY + 8, startX + 110, startY + 8); // underline

    doc.text("Date:", startX + 120, startY + 8);
    doc.line(startX + 132, startY + 8, startX + 175, startY + 8);

    doc.text("Roll No:", startX + 5, startY + 18);
    doc.line(startX + 22, startY + 18, startX + 60, startY + 18);

    doc.text("Class:", startX + 70, startY + 18);
    doc.line(startX + 85, startY + 18, startX + 130, startY + 18);

    doc.text("Sign:", startX + 140, startY + 18);
    doc.line(startX + 152, startY + 18, startX + 175, startY + 18);

    startY += 32;

    // 5. Instructions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INSTRUCTIONS FOR CANDIDATES:", startX, startY);
    startY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("1. Use a dark pen or HB pencil to fill the circles completely.", startX, startY);
    startY += 5;
    doc.text("2. Do not use tick marks or cross marks.", startX, startY);
    startY += 5;
    doc.text("3. Erase completely to change your response. Do not make any stray marks on this sheet.", startX, startY);
    startY += 10;

    doc.line(startX, startY, pageWidth - margin, startY);
    startY += 8;

    // 6. Draw Grids for Bubbles (Multi-column layout)
    let currentY = startY;
    let gridStartY = startY;
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = margin + 10; // ensures enough padding at bottom

    const columnsPerPage = 4;
    const colWidth = (pageWidth - (margin * 2)) / columnsPerPage;

    let currentColumn = 0;

    mcqs.forEach((q, index) => {
        const qNum = index + 1;

        if (currentY + 8.5 > pageHeight - bottomMargin) {
            currentColumn++;
            if (currentColumn >= columnsPerPage) {
                doc.addPage();
                currentColumn = 0;
                gridStartY = margin + 15; // lower start on new pages for padding
            }
            currentY = gridStartY;
        }

        const x = startX + (currentColumn * colWidth);
        const y = currentY;

        // Draw Q. Number
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        // Right-align single digit numbers to match double digits visually
        const numStr = `${qNum}.`;
        doc.text(numStr, x + (numStr.length < 3 ? 3 : 0), y);

        // Draw Bubbles dynamically based on options array length!
        // Cap it between A-B (2) to A-F (6) for sanity.
        const numOptions = Math.max(2, Math.min((q.content.options || []).length, 6));
        let bubbleX = x + 12;

        for (let i = 0; i < numOptions; i++) {
            const letter = String.fromCharCode(65 + i); // A, B, C, D...

            doc.setDrawColor(0, 0, 0); // black border
            doc.setLineWidth(0.3);
            doc.circle(bubbleX, y - 1.2, 2.5, "S"); // Stroke

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            const letterWidth = doc.getTextWidth(letter);
            doc.text(letter, bubbleX - (letterWidth / 2), y); // Center text inside bubble

            bubbleX += 7; // Horizontal spacing between bubbles in a row
        }

        currentY += 9; // Increase row height slightly to add more breathing room vertically
    });

    // Save the PDF
    const safeName = (metadata.examName || "Paper").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}_omr_sheet.pdf`);
};
