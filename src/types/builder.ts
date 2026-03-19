export type QuestionType = "MCQ" | "TF" | "DESCRIPTIVE" | "MATCH" | "MAP" | "FILL_IN_THE_BLANKS" | "SHORT_ANSWER" | "LONG_ANSWER" | "DATA_TABLE" | "CUSTOM";

export interface Question {
    id: string;
    type: QuestionType;
    content: any; // specific per type
    marks: number;
    sequenceOrder: number;
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageAlignment?: 'left' | 'center' | 'right';
    customHeading?: string;
    sectionHeading?: string;
    hasOr?: boolean;
}

export interface PaperMetadata {
    schoolName: string;
    subject: string;
    examName: string;
    totalMarks: number;
    date: string;
    instructions: string;
    standard: string;
    timeAllowed: string;
    showStudentInfo: boolean;
    schoolLogo?: string;
    schoolLogoWidth?: number;
    schoolLogoHeight?: number;
    schoolLogoAlignment?: 'left' | 'center' | 'right';
    showAnswerLines?: boolean;
    headerTemplate?: 'classic' | 'modern' | 'ivyleague' | 'minimalist';
    watermarkImage?: string;
    watermarkOpacity?: number;
    // Accessibility (Phase 5)
    isDyslexiaFriendly?: boolean;
    // Digital Publishing
    isPublishedOnline?: boolean;
}

// Structure per question type
export interface MCQContent {
    questionText: string;
    options: string[]; // typically 4
    correctIndex?: number;
}

export interface TFContent {
    questionText: string;
    isTrue?: boolean;
    solutionText?: string;
}

export interface DescriptiveContent {
    questionText: string;
    linesRequired: number;
    solutionText?: string;
}

export interface MatchContent {
    questionText: string;
    pairs: { left: string; right: string }[];
    solutionText?: string;
}

export interface MapContent {
    questionText: string;
    placesToMark: string[];
}

export interface FillInBlankContent {
    questionText: string; // use "___" for blank
    solutionText?: string;
}

export interface DataTableContent {
    questionText: string;
    tableData: string[][]; // 2D array of strings representing table rows and columns
    options: string[]; // typically 4 options like MCQ
    correctIndex?: number;
    solutionText?: string;
}

export interface CustomContent {
    questionText: string;
    linesRequired: number;
    solutionText?: string;
}
