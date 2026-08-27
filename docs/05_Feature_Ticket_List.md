# ExamCraft Pro — Feature Ticket List

> **Version:** 1.0  
> **Date:** August 27, 2026  
> **Author:** ExamCraft Pro Team  
> **Status:** Living Document

---

## Legend

| Label | Meaning |
|-------|---------|
| 🔴 **P0** | Critical — must be done before production launch |
| 🟡 **P1** | High — important for launch quality |
| 🟢 **P2** | Medium — post-launch enhancement |
| 🔵 **P3** | Low — nice-to-have |
| ✅ **Done** | Already implemented in current codebase |

---

## Category 1: Security & Authentication

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| SEC-001 | Integrate Stripe Payment | 🔴 P0 | 🔲 Todo | Replace mock credit purchase with Stripe Checkout + webhooks for verified payments |
| SEC-002 | Rate Limiting on Auth Routes | 🔴 P0 | 🔲 Todo | Add rate limiting to `/api/auth/register` and login to prevent brute-force attacks |
| SEC-003 | CSRF Protection | 🔴 P0 | 🔲 Todo | Implement CSRF tokens or SameSite cookie policy on all state-changing API routes |
| SEC-004 | Email Verification | 🟡 P1 | 🔲 Todo | Send verification email on registration; block login until verified |
| SEC-005 | Password Reset Flow | 🟡 P1 | 🔲 Todo | Forgot password → email token → reset form → password update |
| SEC-006 | Password Complexity Rules | 🟡 P1 | 🔲 Todo | Enforce min 8 chars, uppercase, lowercase, number on registration |
| SEC-007 | Security Headers | 🟢 P2 | 🔲 Todo | Add CSP, X-Frame-Options, X-Content-Type-Options, HSTS via middleware |
| SEC-008 | CAPTCHA on Registration | 🟢 P2 | 🔲 Todo | Add Google reCAPTCHA v3 to registration and student test submission forms |
| SEC-009 | Rotate Exposed Secrets | 🔴 P0 | 🔲 Todo | Rotate all API keys, OAuth secrets, and DB passwords that were in `.env` |
| SEC-010 | Admin Audit Logging | 🟢 P2 | 🔲 Todo | Log all admin actions (user approvals, paper status changes) with timestamps |

---

## Category 2: Core Platform

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| CORE-001 | User Registration & Login | 🔴 P0 | ✅ Done | Email/password + Google OAuth via NextAuth.js |
| CORE-002 | JWT Session Management | 🔴 P0 | ✅ Done | Stateless JWT with role, credits, approval status |
| CORE-003 | Paper CRUD Operations | 🔴 P0 | ✅ Done | Create, read, update, delete papers with questions |
| CORE-004 | Teacher Approval Workflow | 🔴 P0 | ✅ Done | Admin approves teacher accounts before they can create papers |
| CORE-005 | Paper Status Workflow | 🔴 P0 | ✅ Done | DRAFT → PENDING_ADMIN → PENDING_SUPERADMIN → APPROVED/REJECTED |
| CORE-006 | Credit System | 🔴 P0 | ✅ Done | 3 free credits on registration; credit deduction on AI usage |
| CORE-007 | Database Migrations Setup | 🟡 P1 | 🔲 Todo | Create proper Prisma migration files (currently using `prisma db push`?) |
| CORE-008 | Error Monitoring (Sentry) | 🟡 P1 | 🔲 Todo | Integrate Sentry or similar for production error tracking |
| CORE-009 | Health Check Endpoint | 🟢 P2 | 🔲 Todo | Add `/api/health` endpoint for uptime monitoring |
| CORE-010 | Environment Config Validation | 🟡 P1 | 🔲 Todo | Validate all required env vars on startup; fail fast if missing |

---

## Category 3: AI Features

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| AI-001 | AI Question Parsing | 🔴 P0 | ✅ Done | Parse raw text/PDF/DOCX/images into structured question JSON |
| AI-002 | AI Variant Generation | 🔴 P0 | ✅ Done | Generate anti-cheat Set B/C/D with rewritten questions |
| AI-003 | Exponential Backoff Retry | 🔴 P0 | ✅ Done | 3 retries with 1s/2s/4s backoff on 503/429 errors |
| AI-004 | JSON Escape Sanitizer | 🔴 P0 | ✅ Done | Fix invalid LaTeX escapes in AI JSON output |
| AI-005 | MCQ Option Prefix Stripping | 🟡 P1 | ✅ Done | Regex cleanup of AI-generated option prefixes |
| AI-006 | AI Usage Analytics | 🟢 P2 | 🔲 Todo | Track parse success/failure rates, avg response time, credit usage |
| AI-007 | Custom AI Model Selection | 🔵 P3 | 🔲 Todo | Allow admin to configure AI model (flash vs pro) per use case |
| AI-008 | Batch Question Parsing | 🟢 P2 | 🔲 Todo | Parse multiple sections/files in a single AI call for efficiency |

---

## Category 4: Paper Builder

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| BLD-001 | WYSIWYG Split-Pane Builder | 🔴 P0 | ✅ Done | Left panel = controls, Right panel = live A4 preview |
| BLD-002 | 10 Question Types | 🔴 P0 | ✅ Done | MCQ, TF, Descriptive, Short, Long, Match, Map, FIB, DataTable, Custom |
| BLD-003 | Live A4 Pagination | 🔴 P0 | ✅ Done | Real-time page break calculation with DOM measurement |
| BLD-004 | Section Grouping & Headings | 🔴 P0 | ✅ Done | Section headings and custom headings with accordion UI |
| BLD-005 | OR Question Support | 🟡 P1 | ✅ Done | `hasOr` flag for alternative questions |
| BLD-006 | Image Attachments per Question | 🟡 P1 | ✅ Done | Inline image upload with alignment and sizing controls |
| BLD-007 | Paper Shuffle (Local) | 🟡 P1 | ✅ Done | Randomize question + option order; re-map correct indices |
| BLD-008 | Premium Header Templates | 🟡 P1 | ✅ Done | Classic, Modern, Ivy League, Minimalist templates |
| BLD-009 | School Logo Upload & Sizing | 🟡 P1 | ✅ Done | Base64 logo with width/height/alignment controls |
| BLD-010 | Dyslexia-Friendly Mode | 🟢 P2 | ✅ Done | Comic Sans MS font, 1.5 line spacing, larger text |
| BLD-011 | Watermark Support | 🟢 P2 | ✅ Done | Upload watermark image with opacity control |
| BLD-012 | Mobile Responsive Builder | 🟡 P1 | ✅ Done | Tab-based Build/Preview switching on mobile |
| BLD-013 | Drag-and-Drop Reordering | 🟢 P2 | 🔲 Todo | Use `@hello-pangea/dnd` for visual question reordering (package installed but not wired) |
| BLD-014 | Undo/Redo Support | 🟢 P2 | 🔲 Todo | Add undo/redo stack for question edits |
| BLD-015 | Auto-Save Draft | 🟡 P1 | 🔲 Todo | Periodically auto-save paper to database to prevent data loss |
| BLD-016 | Keyboard Shortcuts | 🔵 P3 | 🔲 Todo | Ctrl+S (save), Ctrl+P (print), etc. |

---

## Category 5: Export Engine

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| EXP-001 | PDF Export (Browser Print) | 🔴 P0 | ✅ Done | Pixel-perfect A4 via `window.print()` |
| EXP-002 | DOCX Export | 🔴 P0 | ✅ Done | Microsoft Word export with full formatting |
| EXP-003 | Answer Key PDF | 🟡 P1 | ✅ Done | Tabular answer key with school branding |
| EXP-004 | OMR Sheet PDF | 🟡 P1 | ✅ Done | Bubble sheet for MCQ-only papers |
| EXP-005 | Server-Side PDF Generation | 🟢 P2 | 🔲 Todo | Replace browser print with Puppeteer/Playwright for server-side PDF |
| EXP-006 | Bulk Export (Zip) | 🟢 P2 | 🔲 Todo | Export Set A + Set B + Answer Keys in a single zip download |
| EXP-007 | CSV Submission Export | 🟡 P1 | 🔲 Todo | Export all student submissions as CSV for grade book import |

---

## Category 6: Online Testing

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| TST-001 | Online Test Publishing Toggle | 🔴 P0 | ✅ Done | Publish/unpublish papers with shareable link |
| TST-002 | Public Student Test Interface | 🔴 P0 | ✅ Done | Clean test-taking UI with question types |
| TST-003 | Auto-Grading Engine (MCQ/TF) | 🔴 P0 | ✅ Done | Instant scoring for MCQ and True/False questions |
| TST-004 | Submission Storage | 🔴 P0 | ✅ Done | Store responses in `StudentSubmission` table |
| TST-005 | Student Report View | 🟡 P1 | ✅ Done | Per-student question-by-question breakdown report |
| TST-006 | Test Timer | 🟡 P1 | 🔲 Todo | Countdown timer based on `timeAllowed` metadata |
| TST-007 | Prevent Multiple Submissions | 🟡 P1 | 🔲 Todo | Block duplicate submissions by student name + roll no |
| TST-008 | Randomized Question Order per Student | 🟢 P2 | 🔲 Todo | Show questions in random order for each test taker |
| TST-009 | Test Access Code | 🟢 P2 | 🔲 Todo | Require a passcode to start the test (teacher-generated) |
| TST-010 | Test Window Scheduling | 🟢 P2 | 🔲 Todo | Set start/end time window for test availability |
| TST-011 | Anti-Cheat: Tab Switch Detection | 🟢 P2 | 🔲 Todo | Detect and log when student switches browser tabs |
| TST-012 | Fill-in-the-Blank Auto-Grading | 🟢 P2 | 🔲 Todo | String matching for auto-grading fill-in-the-blank answers |

---

## Category 7: Admin & Operations

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| ADM-001 | Admin User Approval Panel | 🔴 P0 | ✅ Done | Approve/deny pending teacher registrations |
| ADM-002 | Admin Paper Review Panel | 🔴 P0 | ✅ Done | Review pending papers with "Review & Edit" action |
| ADM-003 | SuperAdmin Full Access | 🔴 P0 | ✅ Done | Unrestricted status transitions, sees all pending items |
| ADM-004 | User Management Dashboard | 🟡 P1 | 🔲 Todo | List all users with search, filter, edit roles, deactivate accounts |
| ADM-005 | Paper Analytics Dashboard | 🟢 P2 | 🔲 Todo | Charts for papers created, credits used, AI usage per teacher |
| ADM-006 | System Settings Panel | 🟢 P2 | 🔲 Todo | Configure default credits, AI model, maintenance mode |
| ADM-007 | Email Notifications | 🟡 P1 | 🔲 Todo | Notify teachers on approval/rejection; admins on new registrations |
| ADM-008 | Bulk User Import | 🟢 P2 | 🔲 Todo | CSV import for school teacher onboarding |

---

## Category 8: DevOps & Infrastructure

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| OPS-001 | GitHub Actions CI/CD | 🔴 P0 | ✅ Done | Auto-deploy on push to `main` via SSH |
| OPS-002 | PM2 Process Management | 🔴 P0 | ✅ Done | Production process manager with auto-restart |
| OPS-003 | Production Environment Setup | 🔴 P0 | 🔲 Todo | Configure production `.env`, SSL, domain, nginx reverse proxy |
| OPS-004 | Database Backups | 🟡 P1 | 🔲 Todo | Automated daily MySQL backups with retention policy |
| OPS-005 | Uptime Monitoring | 🟡 P1 | 🔲 Todo | Set up UptimeRobot or similar for health monitoring |
| OPS-006 | Log Aggregation | 🟢 P2 | 🔲 Todo | Centralized logging (PM2 logs → file rotation or cloud logging) |
| OPS-007 | Staging Environment | 🟢 P2 | 🔲 Todo | Separate staging VPS/branch for testing before production |
| OPS-008 | Database Connection Pooling | 🟡 P1 | 🔲 Todo | Configure Prisma connection pool limits for production |
| OPS-009 | CDN for Static Assets | 🟢 P2 | 🔲 Todo | Serve static files via CloudFlare or Vercel CDN |
| OPS-010 | Horizontal Scaling Plan | 🔵 P3 | 🔲 Todo | Document strategy for scaling beyond single VPS |

---

## Category 9: User Experience

| # | Ticket | Priority | Status | Description |
|---|--------|----------|--------|-------------|
| UX-001 | Onboarding Tour | 🟢 P2 | 🔲 Todo | First-time user walkthrough of the builder |
| UX-002 | Empty States | 🟡 P1 | ✅ Done | Placeholder cards when no papers exist |
| UX-003 | Loading Skeletons | 🟢 P2 | 🔲 Todo | Skeleton screens for data-loading pages |
| UX-004 | Dark Mode | 🔵 P3 | 🔲 Todo | Theme toggle using `next-themes` (package already installed) |
| UX-005 | Keyboard Navigation | 🟢 P2 | 🔲 Todo | Full keyboard accessibility for all interactive elements |
| UX-006 | i18n / Localization | 🟢 P2 | 🔲 Todo | Multi-language support (Hindi, Marathi, Spanish) |
| UX-007 | Toast Notification Improvements | 🔵 P3 | 🔲 Todo | Undo action on destructive operations (delete paper) |

---

## Summary Dashboard

| Category | Total | Done | Todo | Completion |
|----------|-------|------|------|------------|
| Security & Auth | 10 | 0 | 10 | 0% |
| Core Platform | 10 | 6 | 4 | 60% |
| AI Features | 8 | 5 | 3 | 63% |
| Paper Builder | 16 | 12 | 4 | 75% |
| Export Engine | 7 | 4 | 3 | 57% |
| Online Testing | 12 | 5 | 7 | 42% |
| Admin & Ops | 8 | 3 | 5 | 38% |
| DevOps & Infra | 10 | 2 | 8 | 20% |
| User Experience | 7 | 1 | 6 | 14% |
| **TOTAL** | **88** | **38** | **50** | **43%** |

### P0 (Launch-Critical) Status

| Total P0 | Done | Remaining |
|----------|------|-----------|
| 27 | 22 | **5 tickets remaining** |

**Critical P0 items still TODO:**
1. `SEC-001` — Stripe Payment Integration
2. `SEC-002` — Rate Limiting on Auth
3. `SEC-003` — CSRF Protection
4. `SEC-009` — Rotate Exposed Secrets
5. `OPS-003` — Production Environment Setup
