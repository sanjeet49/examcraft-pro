import fetch from 'node-fetch'; // if needed, but Next.js handler can be imported

// Wait, I can't easily run the Next.js API route locally without the server up.
// Let's just create a test script that uses @google/genai directly.

import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const text = `Unity English Medium School, Ankleshwar
DATE : 02/02/26                    	 Yoga, Health and Physical Education                  TOTAL MARKS : 50 STD : X 				      BOARD EXAMINATION  2025-26          	       TIME : 1 HOURS

1. Which step of Ashtanga Yoga is Dharana?
   A. Fifth  		B. Sixth  	C. Seventh  		D. Fourth
2. In which of the following is the Continuity of the concentration of the mind maintained.
   A. Dharana  	B. Dhyan  	C. Shatkriyas  	D. Pratyahar

ATHLETICS
21. What is the minimum weight of the baton?
A. 30g  			B. 40g  		C. 50g 			D. 45g

OR: BASKETBALL
36. In which year were the rules of basketball as an International game released?
    A. In 1874  		B. In 1884  		C. In 1894  			D. In 1904
`;

const prompt = `You are an expert AI exam extractor for teachers. Your job is to extract structured questions from the provided raw text instructions
Convert the output into a precise JSON array of question objects.
Return ONLY a valid JSON array. Do not include markdown formatting.
    
The question objects MUST adhere precisely to these types:
"MCQ", "TF", "DESCRIPTIVE", "MATCH", "MAP", "FILL_IN_THE_BLANKS", "DATA_TABLE", "SHORT_ANSWER", "LONG_ANSWER", "CUSTOM".

CRITICAL PARSING RULES for HEADINGS:
1. If you see a top-level, overarching title like "Section A", "ATHLETICS", "KABADDI", or "OR: BASKETBALL", you MUST extract this specific centered heading text into the new \`sectionHeading\` property of the JSON question object! Preserve the exact wording.
2. Then, if there is a specific sub-instruction for the question format beneath it (e.g., "Tick the Correct Option", "Multiple choice questions :", "Fill in the blanks :", or "Match the following :"), you MUST extract THAT sub-instruction string into the \`customHeading\` property!
3. Both \`sectionHeading\` and \`customHeading\` must be passed down recursively into EVERY child question inside that group. It is absolutely essential so the UI groups them correctly.

CRITICAL PARSING RULES for DATA:
1. Extract the marks accurately. Divide parent group marks among the children evenly. E.g if a group of 4 questions is [2M] total, each gets 0.5 marks. If it's [4M], each gets 1 mark. CRITICAL: Every single question object MUST have a "marks" value strictly greater than 0, UNLESS its type is "CUSTOM". If no marks are provided, default to 1 mark per question.
4. Maintain the proper order of the questions using the \`sequenceOrder\` field, starting from 1.
5. STRICT PRESERVATION: DO NOT strip sequence numbering! Keep the exact text of the question, including its original number (e.g., "1. Which step...", "A. ...") precisely as it appears in the source text. Do not change anything.
6. For MCQ, extract the multiple choice options into the \`options\` array. Preserve their original numbering (e.g. "A. Fifth", "B. Sixth") exactly as written.
7. For Fill in the Blanks sentences, use "___" for the blank space! If options are provided inline like "(1, 2, 3)", keep them in the \`questionText\`.
8. **Math & Science Formatting**: Preserve all superscripts, subscripts, fractions, and symbols intact (e.g. use x², x³, HCF, LCM, α, β, √, ∑). Do NOT break the JSON structure with unescaped backslashes.
9. **Matching Sections**: If a section says "Match the following", COMBINE all the pairs into a SINGLE "MATCH" question block! Do NOT split them into individual questions. Put all left/right pairs into the \`pairs: [{left, right}]\` array. If one column has more items than the other, pad the missing side with an empty string "".
10. **Data Tables**: If you detect a frequency distribution, statistics table, or grid of data (like "Class | Frequency" or "Monthly consumption"), use the "DATA_TABLE" type! Map the columns and rows precisely into the \`tableData: string[][]\` 2D array, and put the actual question prompt (e.g. "Find the mean of the data") into \`questionText\`.
11. **Reading Comprehension / Pure Text**: Anything that is just reading material (like a paragraph or poem) must use the "CUSTOM" type with 0 marks.

Format for each object:
{
  "id": "generate-a-unique-string",
  "type": "ONE_OF_THE_TYPES",
  "marks": number,
  "sequenceOrder": number,
  "sectionHeading": "string (OPTIONAL: The centered top-level title e.g. 'Section A' or 'Part 1')",
  "customHeading": "string (OPTIONAL: The left-aligned instruction e.g. 'Multiple choice questions :')",
  "content": { // specific to the type }
}

Content structures required for the "content" property:
MCQ: { questionText: string, options: string[], correctIndex?: number }
TF: { questionText: string, isTrue?: boolean }
SHORT_ANSWER: { questionText: string, linesRequired: number } // Typically 3 lines
LONG_ANSWER: { questionText: string, linesRequired: number } // Typically 6 lines
DESCRIPTIVE: { questionText: string, linesRequired: number } // General descriptive
MATCH: { questionText: string, pairs: [{left: string, right: string}] } // e.g. [{left: "Plump", right: "stout"}]
FILL_IN_THE_BLANKS: { questionText: string } // use "___" for blank
DATA_TABLE: { questionText: string, tableData: string[][] } 
CUSTOM: { questionText: string, linesRequired: 0 } // Use this for large reading comprehenion paragraphs so the student just reads it.

Raw Instructions from User:
${text}
`;

async function main() {
    const aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

    const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
        config: {
            responseMimeType: "application/json"
        }
    });

    const textOutput = response.text;
    console.log(textOutput);
}

main().catch(console.error);
