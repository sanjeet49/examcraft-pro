# ExamCraft Pro — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Date:** August 27, 2026  
> **Author:** ExamCraft Pro Team  
> **Status:** Living Document

---

## 1. Product Vision & Mission

**Vision:** Become the #1 AI-powered exam creation platform for teachers and educational institutions globally.

**Mission:** Empower teachers to create, manage, publish, and grade professionally formatted exam papers in minutes — not hours — using AI-native tooling and a WYSIWYG builder.

---

## 2. Problem Statement

Teachers spend **3–5 hours per exam** manually formatting question papers in Microsoft Word. They also lack:

- **Anti-cheat tooling** — no easy way to generate unique paper sets (Set A, Set B, Set C) for each row of students.
- **Structured question extraction** — raw text from textbooks, PDFs, and DOCX files must be manually restructured into MCQ, True/False, Match, etc.
- **Online test publishing** — no simple mechanism to publish a paper online and auto-grade student submissions.
- **Export flexibility** — generating Answer Keys, OMR sheets, and DOCX/PDF exports from the same paper requires multiple tools.

---

## 3. Target Users & Personas

| Persona | Description | Needs |
|---------|-------------|-------|
| **Teacher (Free/Pro)** | School teacher creating 2–10 exams per semester | AI question parsing, PDF/DOCX export, online test publishing |
| **Admin** | School coordinator reviewing teacher-created papers | Paper approval workflow, user management |
| **Super Admin** | Platform owner / school principal | Full access to all users, papers, billing, and system controls |
| **Student** | Takes exams published online | Clean test interface, auto-graded results |

---

## 4. User Roles & Access Matrix

| Capability | Teacher | Admin | Super Admin | Student (Public) |
|------------|---------|-------|-------------|------------------|
| Register / Login | ✅ | ✅ | ✅ | ❌ |
| Create Papers | ✅ (after approval) | ✅ | ✅ | ❌ |
| Use AI Parse / Variant | ✅ (credit-gated) | ✅ (unlimited) | ✅ (unlimited) | ❌ |
| Save / Edit Papers | ✅ (own) | ✅ (all) | ✅ (all) | ❌ |
| Submit Paper for Review | ✅ | ❌ | ❌ | ❌ |
| Approve / Reject Papers | ❌ | ✅ | ✅ | ❌ |
| Approve Users | ❌ | ✅ (Teachers) | ✅ (All) | ❌ |
| Publish Paper Online | ✅ (own) | ✅ | ✅ | ❌ |
| Take Online Test | ❌ | ❌ | ❌ | ✅ |
| View Submission Reports | ✅ (own papers) | ✅ | ✅ | ❌ |
| Export PDF / DOCX / OMR / Answer Key | ✅ | ✅ | ✅ | ❌ |
| Buy Credits | ✅ | ✅ | ✅ | ❌ |
| Admin Portal | ❌ | ✅ | ✅ | ❌ |

---

## 5. Core Features

### 5.1 AI-Powered Question Parsing (`/api/ai/parse`)

- **Input:** Raw text instructions, PDF documents, DOCX files, and images.
- **Output:** Structured JSON array of question objects.
- **Supported Types:** MCQ, True/False, Descriptive, Short Answer, Long Answer, Match the Following, Fill in the Blanks, Map, Data Table, Custom.
- **Intelligence:**
  - Auto-detects section headings and custom headings.
  - Distributes marks evenly across grouped questions.
  - Preserves LaTeX math notation (`$...$` and `$$...$$`).
  - Extracts pre-solved answers into `solutionText`.
  - Strips MCQ option prefixes (A., B), etc.).
- **Cost:** 1 credit per successful parse.

### 5.2 AI Anti-Cheat Variant Generator (`/api/ai/variant`)

- Rewrites all questions to create a new exam set (Set B, Set C, etc.).
- Maintains identical structure, type, marks, and difficulty.
- Changes scenarios, names, values, options, and matching pairs.
- Preserves solution text for each variant question.
- **Cost:** 1 credit per successful generation.

### 5.3 Paper Builder (WYSIWYG)

- **Split-pane interface:** Left = build controls, Right = live A4 preview.
- **10 question types** with type-specific editors.
- **Live A4 pagination engine** — calculates page breaks in real-time.
- **Features:** Drag-and-drop reordering, section grouping, OR question support, inline image attachments per question.
- **Paper metadata:** School name, logo, exam name, subject, date, total marks, standard/class, time allowed, instructions.
- **Premium branding:** 4 header templates (Classic, Modern, Ivy League, Minimalist), custom logo sizing/alignment, school name sizing/alignment, watermark support, dyslexia-friendly mode.

### 5.4 Export Engine

| Export Type | Format | Description |
|-------------|--------|-------------|
| Exam Paper | PDF (browser print) | Pixel-perfect A4 print via browser's native print engine |
| Exam Paper | DOCX | Microsoft Word format with precise margin control and formatting |
| Answer Key | PDF | Tabular answer key with school branding |
| OMR Sheet | PDF | Machine-readable bubble sheet for MCQ-only exams |

### 5.5 Online Test Publishing

- Toggle any saved paper to "Published Online" status.
- Generates a shareable link: `/test/{paperId}`.
- Students access without login (public endpoint).
- **Auto-grading engine:** MCQ and True/False questions are graded instantly.
- Submission data stored in `StudentSubmission` table.

### 5.6 Submission & Reporting

- View all student submissions per paper.
- Per-student detailed report with question-by-question breakdown.
- Correct/Incorrect/Unattempted status badges.
- Print-friendly PDF report layout.
- Manual grading indicator for descriptive questions.

### 5.7 Paper Shuffle

- Randomizes question order and MCQ option order.
- Re-maps correct answer indices.
- Auto-generates unique Set ID (letter + 4-digit salt).
- Zero AI cost (local operation).

### 5.8 Admin Portal

- **User Management:** Approve/deny pending teacher registrations.
- **Paper Review:** Review and edit pending papers in the builder.
- **Status Workflow:** `DRAFT → PENDING_ADMIN → PENDING_SUPERADMIN → APPROVED / REJECTED`.

---

## 6. Monetization Model

| Plan | Price | Credits | Extras |
|------|-------|---------|--------|
| Free Tier | $0 | 3 credits on registration | Basic exports |
| Starter Pack | $5 (one-time) | 10 credits | Unlimited DOCX/PDF Exports |
| Pro Teacher Pack | $20 (one-time) | 50 credits | Priority AI, Premium Templates |

> **Note:** Admins and Super Admins have unlimited AI credits (no deduction on parse/variant).

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Availability** | 99.5% uptime |
| **Response Time** | API responses < 2s (excluding AI generation) |
| **AI Generation** | < 30s for parse/variant (with 3 retries, exponential backoff) |
| **Concurrent Users** | Support 500+ concurrent users |
| **Browser Support** | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| **Mobile Support** | Responsive design with dedicated mobile tab bar and bottom navigation |
| **Print Accuracy** | Pixel-perfect A4 output (210mm × 297mm at 96dpi) |

---

## 8. Success Metrics (KPIs)

| Metric | Target (6 months) |
|--------|--------------------|
| Registered Teachers | 1,000+ |
| Papers Created | 5,000+ |
| AI Parse Success Rate | > 95% |
| Credits Purchased | $10,000+ revenue |
| Student Tests Completed | 10,000+ |
| Average Paper Creation Time | < 15 minutes |

---

## 9. Future Roadmap

| Phase | Feature | Priority |
|-------|---------|----------|
| Phase 2 | Stripe Payment Integration (replace mock checkout) | 🔴 Critical |
| Phase 2 | Email verification & password reset | 🔴 Critical |
| Phase 3 | Question Bank (save & reuse questions across papers) | 🟡 High |
| Phase 3 | Bulk student import (CSV upload for class rosters) | 🟡 High |
| Phase 4 | Multi-language support (Hindi, Marathi, etc.) | 🟡 High |
| Phase 4 | Real-time collaborative editing | 🟢 Medium |
| Phase 5 | Analytics dashboard (teacher/admin insights) | 🟢 Medium |
| Phase 5 | Mobile app (React Native) | 🟢 Medium |
