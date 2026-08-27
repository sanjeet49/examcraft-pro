# ExamCraft Pro — Frontend Specification Document

> **Version:** 1.0  
> **Date:** August 27, 2026  
> **Author:** ExamCraft Pro Team  
> **Status:** Living Document

---

## 1. Frontend Architecture Overview

ExamCraft Pro uses **Next.js 16.1.6 App Router** with a hybrid rendering strategy:
- **Server Components (SSR):** Dashboard, Admin Portal, Test Page data fetching
- **Client Components (CSR):** Paper Builder, Login/Register, Settings, Interactive Reports

### Design System

| Property | Value |
|----------|-------|
| **CSS Framework** | Tailwind CSS 4.x |
| **Component Library** | shadcn/ui (built on Radix UI primitives) |
| **Typography** | Geist Sans + Geist Mono (Google Fonts) |
| **Icons** | Lucide React (0.575.0) |
| **Color Palette** | Indigo primary, Gray neutrals, Amber accents |
| **Math Rendering** | KaTeX + react-latex-next |
| **Notifications** | Sonner (toast library) |

---

## 2. Page Directory & Component Map

### 2.1 Route Structure

```
src/app/
├── page.tsx                          # Landing page (SSR)
├── layout.tsx                        # Root layout (Providers, fonts, KaTeX CSS)
├── login/page.tsx                    # Login page (CSR)
├── register/page.tsx                 # Registration page (CSR)
├── test/[id]/page.tsx                # Student test page (SSR → CSR)
└── dashboard/
    ├── layout.tsx                    # Dashboard shell (sidebar + nav) (CSR)
    ├── page.tsx                      # Dashboard home (SSR)
    ├── builder/page.tsx              # Paper Builder (CSR) — 2,392 lines
    ├── admin/page.tsx                # Admin portal (SSR)
    ├── settings/page.tsx             # Account & billing (CSR)
    └── submissions/
        └── [id]/
            ├── page.tsx              # Submission list (SSR)
            └── report/
                └── [submissionId]/
                    └── page.tsx      # Student report (SSR → CSR)
```

### 2.2 Component Tree

```
src/components/
├── Providers.tsx                     # NextAuth SessionProvider wrapper
├── admin/
│   └── ApproveUserButton.tsx         # Client-side user approval button
├── dashboard/
│   ├── AILoadingOverlay.tsx          # Full-screen AI processing overlay
│   ├── PaperCard.tsx                 # Paper card + empty state card
│   ├── QuestionEditor.tsx            # Per-question-type inline editor
│   └── StudentReportView.tsx         # Print-friendly student report
├── test/
│   └── StudentTestView.tsx           # Full student test-taking interface
└── ui/                               # shadcn/ui component library
    ├── accordion.tsx
    ├── alert.tsx
    ├── button.tsx
    ├── card.tsx
    ├── checkbox.tsx
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    ├── form.tsx
    ├── input.tsx
    ├── label.tsx
    ├── scroll-area.tsx
    ├── select.tsx
    ├── separator.tsx
    ├── sonner.tsx
    ├── table.tsx
    ├── tabs.tsx
    └── textarea.tsx
```

---

## 3. Page Specifications

### 3.1 Landing Page (`/`)

| Property | Details |
|----------|---------|
| **Rendering** | Server Component (SSR) |
| **Layout** | Full-screen hero with gradient background |
| **Background** | `bg-gradient-to-br from-indigo-50 via-white to-cyan-50` |
| **Headline** | "Create Perfect A4 Exams with ExamCraft Pro" |
| **CTAs** | "Start Creating" (→ `/login`), "Sign Up" (→ `/register`) |
| **Feature Cards** | 3 cards: AI Question Factory, Live A4 Preview, 1-Click Exports |

---

### 3.2 Login Page (`/login`)

| Property | Details |
|----------|---------|
| **Rendering** | Client Component |
| **Layout** | Centered Card on gray-50 background |
| **Auth Methods** | Email/Password form + Google OAuth button |
| **Validation** | Required fields, loading states |
| **Redirect** | → `/dashboard` on success |
| **Error Handling** | Toast notification via Sonner |

---

### 3.3 Registration Page (`/register`)

| Property | Details |
|----------|---------|
| **Rendering** | Client Component |
| **Fields** | Name, Email, Password |
| **Post-Registration** | Auto-redirect to login with success toast |
| **Default Role** | `TEACHER` with `isApproved: false` |

---

### 3.4 Dashboard Home (`/dashboard`)

| Property | Details |
|----------|---------|
| **Rendering** | Server Component (SSR) |
| **Sections** | Approval warning (if unapproved), Admin portal link (if admin), Credits card, Quick Actions, Recent Papers grid |
| **Data Fetching** | Server-side Prisma query (last 6 papers by user) |
| **Components Used** | `PaperCard`, `EmptyPaperCard`, `Alert`, `Button`, `Card` |

---

### 3.5 Paper Builder (`/dashboard/builder`)

> **The most complex page in the application (2,392 lines)**

| Property | Details |
|----------|---------|
| **Rendering** | Client Component (CSR) |
| **Layout** | Split-pane: Left (builder controls) + Right (live A4 preview) |
| **Mobile** | Tab bar switching between "Build" and "Preview" modes |

#### State Management

| State Variable | Type | Purpose |
|----------------|------|---------|
| `metadata` | `PaperMetadata` | Paper header/layout configuration |
| `questions` | `Question[]` | Ordered array of all questions |
| `smartPasteText` | `string` | AI parsing text input |
| `uploadFiles` | `File[]` | PDF/DOCX/image files for AI parsing |
| `isParsing` | `boolean` | AI operation loading state |
| `isSaving` | `boolean` | Database save loading state |
| `status` | `string` | Paper approval status |
| `pages` | `Question[][]` | Paginated questions for A4 preview |
| `mobileTab` | `'build' \| 'preview'` | Mobile view toggle |
| `fontsLoaded` | `boolean` | Font readiness for accurate pagination |

#### Builder Sections

1. **Paper Details** — School name, logo, exam name, subject, date, marks, standard, time, instructions + checkboxes (student info, answer lines, answer key)
2. **Premium Branding** — Header template selector (Classic/Modern/Ivy League/Minimalist), dyslexia-friendly toggle, watermark upload
3. **AI Smart Paste** — Text area + file upload + parse button
4. **Question Management** — Accordion-grouped question editors by type/section
5. **Action Toolbar** — Save, Export PDF, Export DOCX, Answer Key, OMR Sheet, Shuffle, AI Variant, Status controls, Publish Online

#### A4 Preview Engine

```
┌─────────────────────────┐
│     Live A4 Preview     │
│  ┌───────────────────┐  │
│  │   Page 1 Header   │  │
│  │   ─────────────   │  │
│  │   Question 1      │  │
│  │   Question 2      │  │
│  │   Question 3      │  │  ← DOM-measured heights
│  │   ...             │  │  ← Page break at 1040px
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │   Page 2          │  │
│  │   Question 4      │  │
│  │   Question 5      │  │
│  │   ...             │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

- Uses `useLayoutEffect` for synchronous DOM measurement
- CSS variable `--a4-mobile-scale` for responsive scaling
- A4 dimensions: 794px × 1122px at 96dpi

---

### 3.6 Admin Portal (`/dashboard/admin`)

| Property | Details |
|----------|---------|
| **Rendering** | Server Component (SSR) |
| **Access Control** | Redirect to `/dashboard` if not Admin/SuperAdmin |
| **Sections** | Pending Users list (with approve button), Pending Papers list (with "Review & Edit" link) |
| **SuperAdmin Extra** | Sees all roles' pending items; Admin only sees Teachers |

---

### 3.7 Settings Page (`/dashboard/settings`)

| Property | Details |
|----------|---------|
| **Rendering** | Client Component |
| **Sections** | Profile card (email, plan, credits balance), Credit top-up plans |
| **Plans** | Starter ($5/10 credits), Pro Teacher ($20/50 credits with "BEST VALUE" badge) |
| **Payment** | Mock Stripe (1.5s simulated delay + API call) |

---

### 3.8 Student Test Page (`/test/[id]`)

| Property | Details |
|----------|---------|
| **Rendering** | SSR (data fetch) → CSR (StudentTestView component) |
| **Access** | Public (no authentication) |
| **Gate** | If paper not published → shows "Test Not Available" message |
| **Student Input** | Name, Roll No, Division/Class |
| **Question Rendering** | MCQ (radio), TF (True/False radio), Descriptive (textarea) |
| **Submission** | Auto-graded for MCQ/TF, score displayed on completion |

---

### 3.9 Student Report Page (`/dashboard/submissions/[id]/report/[submissionId]`)

| Property | Details |
|----------|---------|
| **Rendering** | SSR (data) → CSR (StudentReportView) |
| **Layout** | A4-formatted printable report |
| **Sections** | School header, student info box, per-question breakdown |
| **MCQ Display** | Green border = correct, Red border = student's wrong choice, radio indicator |
| **TF Display** | Side-by-side True/False cards with status indicators |
| **Non-Gradable** | Shows student's text response with "Manual Grading Required" badge |
| **Print** | Dedicated print CSS with `break-inside-avoid`, hidden navigation |

---

## 4. Dashboard Layout Shell

### 4.1 Desktop (lg+)

```
┌────────────────┬─────────────────────────────────┐
│   SIDEBAR      │                                  │
│   (256px)      │        MAIN CONTENT              │
│                │                                  │
│  Logo          │                                  │
│  Dashboard     │                                  │
│  New Paper     │                                  │
│  Settings      │                                  │
│                │                                  │
│  Credits: 3    │                                  │
│  User Info     │                                  │
│  Sign Out      │                                  │
└────────────────┴─────────────────────────────────┘
```

### 4.2 Mobile

```
┌──────────────────────────────┐
│  [Logo] ExamCraft  [💰3] [☰] │  ← Top Bar (fixed)
├──────────────────────────────┤
│                              │
│        MAIN CONTENT          │
│                              │
│                              │
├──────────────────────────────┤
│  🏠      ✏️      ⚙️     🚪   │  ← Bottom Nav (fixed)
│ Home   New    Settings Out   │
└──────────────────────────────┘
```

- Hamburger menu slides down from top bar
- Bottom navigation with active state indicators

---

## 5. TypeScript Type System

### 5.1 Core Types

```typescript
// 10 supported question types
type QuestionType = "MCQ" | "TF" | "DESCRIPTIVE" | "MATCH" | "MAP" 
                  | "FILL_IN_THE_BLANKS" | "SHORT_ANSWER" | "LONG_ANSWER" 
                  | "DATA_TABLE" | "CUSTOM";

// Universal question structure
interface Question {
    id: string;
    type: QuestionType;
    content: any;           // Type-specific (see below)
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

// Paper metadata
interface PaperMetadata {
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
    schoolNameAlignment?: 'left' | 'center' | 'right';
    schoolNameSize?: number;
    showAnswerLines?: boolean;
    showAnswerKey?: boolean;
    headerTemplate?: 'classic' | 'modern' | 'ivyleague' | 'minimalist';
    watermarkImage?: string;
    watermarkOpacity?: number;
    isDyslexiaFriendly?: boolean;
    isPublishedOnline?: boolean;
}
```

### 5.2 Content Type Structures

| Type | Content Shape |
|------|---------------|
| MCQ | `{ questionText, options: string[], correctIndex?: number }` |
| TF | `{ questionText, isTrue?: boolean, solutionText?: string }` |
| SHORT_ANSWER | `{ questionText, linesRequired: 3, solutionText? }` |
| LONG_ANSWER | `{ questionText, linesRequired: 10, solutionText? }` |
| DESCRIPTIVE | `{ questionText, linesRequired: number, solutionText? }` |
| MATCH | `{ questionText, pairs: [{left, right}], solutionText? }` |
| MAP | `{ questionText, placesToMark: string[] }` |
| FILL_IN_THE_BLANKS | `{ questionText (use "___"), solutionText? }` |
| DATA_TABLE | `{ questionText, tableData: string[][], options: string[], correctIndex?, solutionText? }` |
| CUSTOM | `{ questionText, linesRequired: number, solutionText? }` |

---

## 6. Utility Libraries

### 6.1 Export Utilities (`src/lib/exportUtils.ts`)

- **619 lines** — the largest utility file
- `generateDocx()` — Creates Microsoft Word document with:
  - 4 header template layouts (Classic, Modern, Ivy League, Minimalist)
  - School logo embedding (base64 → ImageRun)
  - Table formatting for metadata
  - Question-type-specific formatting
  - Dyslexia-friendly mode (Comic Sans MS, 1.5 line spacing)
- `generatePdfViaBrowser()` — Triggers `window.print()` for native PDF generation

### 6.2 Answer Key Utilities (`src/lib/answerKeyUtils.ts`)

- `generateAnswerKeyPdf()` — Creates jsPDF document with:
  - School branding header (logo + name)
  - Tabular answer key using `jspdf-autotable`
  - Per-question correct answer extraction
  - Print metadata footer

### 6.3 OMR Sheet Utilities (`src/lib/omrUtils.ts`)

- `generateOmrPdf()` — Creates bubble-sheet style OMR for MCQ-only papers
  - A4 portrait layout
  - Student details header
  - Numbered rows with A/B/C/D bubbles
  - Grid layout for 100+ questions

### 6.4 Safe LaTeX Renderer

```typescript
// Escapes HTML in non-math segments to prevent XSS via react-latex-next
function safeLatexText(text: string): string {
    const parts = text.split(/($$[\s\S]*?$$|$[^$\n]*?$)/g);
    return parts.map((part, i) => 
        i % 2 === 0 
            ? part.replace(/</g, "&lt;").replace(/>/g, "&gt;") 
            : part
    ).join("");
}
```

---

## 7. Responsive Design Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| **Mobile** | < 1024px | Single column, tab bar, bottom nav, hamburger menu |
| **Desktop** | ≥ 1024px (`lg`) | Sidebar + main content, split-pane builder |
| **Print** | `@media print` | Hide all navigation, full-width A4, clean margins |

---

## 8. Third-Party UI Dependencies

| Package | Purpose | Import Pattern |
|---------|---------|----------------|
| `radix-ui` | Accessible primitives (Dialog, Select, Dropdown, etc.) | Via shadcn/ui wrappers |
| `@hello-pangea/dnd` | Drag-and-drop question reordering | Direct import in Builder |
| `react-latex-next` | LaTeX math rendering | `<Latex>` component |
| `katex` | Math typesetting engine | CSS import only |
| `sonner` | Toast notifications | `toast()` function calls |
| `lucide-react` | SVG icons | Named icon imports |
| `dayjs` | Date formatting | `dayjs().format()` in reports |
| `file-saver` | Client-side file downloads | `saveAs()` for DOCX exports |
