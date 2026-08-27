# ExamCraft Pro — Security & Access Control Document

> **Version:** 1.0  
> **Date:** August 27, 2026  
> **Author:** ExamCraft Pro Team  
> **Status:** Living Document

---

## 1. Security Overview

ExamCraft Pro handles sensitive educational data, teacher credentials, and student submissions. This document covers the current security posture, access control model, and critical security improvements required before production deployment.

---

## 2. Authentication Architecture

### 2.1 Authentication Providers

| Provider | Method | Implementation |
|----------|--------|----------------|
| **Credentials** | Email + Password | bcrypt hashing (salt rounds: 10) via `bcryptjs` |
| **Google OAuth 2.0** | Social Login | Google Sign-In via NextAuth.js Google Provider |

### 2.2 Session Management

| Property | Value |
|----------|-------|
| **Strategy** | JWT (stateless) |
| **Session Store** | JWT token (no server-side session lookup per request) |
| **Token Contents** | `id`, `role`, `isApproved`, `isPremium`, `credits` |
| **Sign-in Page** | Custom (`/login`) |
| **Adapter** | PrismaAdapter (for Account/Session/User persistence) |

### 2.3 Password Security

```
User Input → bcrypt.hash(password, 10) → Stored in DB
Login       → bcrypt.compare(input, stored) → Boolean match
```

- **Algorithm:** bcrypt (adaptive hashing)
- **Salt Rounds:** 10 (industry standard)
- **Library:** `bcryptjs` v3.0.3

---

## 3. Authorization Model (RBAC)

### 3.1 Role Hierarchy

```
SUPER_ADMIN (highest privileges)
    │
    ├── ADMIN (manages teachers and papers)
    │
    └── TEACHER (creates and manages own papers)
            │
            └── STUDENT (public, no account — takes tests only)
```

### 3.2 Route-Level Authorization

| API Route | Required Role | Additional Check |
|-----------|---------------|------------------|
| `POST /api/auth/register` | Public | — |
| `POST /api/paper/save` | Any authenticated | — |
| `GET /api/paper/[id]` | Authenticated | Owner OR Admin/SuperAdmin |
| `PUT /api/paper/[id]` | Authenticated | Owner OR Admin/SuperAdmin |
| `DELETE /api/paper/[id]` | Authenticated | Owner OR Admin/SuperAdmin |
| `POST /api/paper/[id]/publish` | Authenticated | Owner OR Admin/SuperAdmin |
| `POST /api/paper/[id]/submit` | Public | Paper must be `isPublishedOnline: true` |
| `POST /api/ai/parse` | Authenticated | Credits > 0 OR Admin/SuperAdmin |
| `POST /api/ai/variant` | Authenticated | Credits > 0 OR Admin/SuperAdmin |
| `POST /api/admin/users/approve` | Admin / SuperAdmin | — |
| `POST /api/admin/papers/status` | Role-dependent | Transition rules enforced (see below) |
| `POST /api/user/credits` | Authenticated | — |

### 3.3 Paper Status Transition Rules

| Current Status | New Status | Allowed Roles |
|----------------|------------|---------------|
| `DRAFT` | `PENDING_ADMIN` | Teacher (own papers only) |
| `PENDING_ADMIN` | `PENDING_SUPERADMIN` | Admin |
| `PENDING_ADMIN` | `APPROVED` | Admin |
| `PENDING_ADMIN` | `REJECTED` | Admin |
| `PENDING_ADMIN` | `DRAFT` | Admin (send back) |
| `PENDING_SUPERADMIN` | `APPROVED` | SuperAdmin |
| `PENDING_SUPERADMIN` | `REJECTED` | SuperAdmin |
| Any | Any | SuperAdmin (unrestricted) |

### 3.4 Teacher Approval Gate

- New teacher accounts have `isApproved: false` by default.
- Unapproved teachers see a warning banner on the dashboard.
- The "Create New Paper" button is disabled for unapproved teachers.
- Approval must be granted by an Admin or Super Admin.

---

## 4. Data Protection

### 4.1 Sensitive Data Inventory

| Data Category | Classification | Storage |
|---------------|---------------|---------|
| User passwords | 🔴 Critical | bcrypt hashed in `User.password` |
| API keys (Gemini, OAuth secrets) | 🔴 Critical | Environment variables (`.env`) |
| JWT secret | 🔴 Critical | `NEXTAUTH_SECRET` env var |
| Student names & roll numbers | 🟡 PII | `StudentSubmission` table |
| Teacher emails | 🟡 PII | `User.email` |
| Exam content | 🟡 Intellectual Property | `Question.content` (JSON) |
| OAuth tokens | 🔴 Critical | `Account` table (`@db.Text`) |

### 4.2 Data at Rest

| Protection | Status | Details |
|------------|--------|---------|
| Password hashing | ✅ Implemented | bcrypt with 10 salt rounds |
| Database encryption | ⚠️ Depends on host | MySQL TDE if supported by hosting provider |
| File storage encryption | N/A | No file uploads stored server-side (processed in-memory) |

### 4.3 Data in Transit

| Protection | Status | Details |
|------------|--------|---------|
| HTTPS/TLS | ✅ Required | Enforced via Hostinger SSL |
| API communication | ✅ HTTPS | All API routes over HTTPS in production |
| Google AI API | ✅ HTTPS | SDK uses HTTPS by default |
| OAuth flow | ✅ HTTPS | Google OAuth requires HTTPS redirect URIs |

---

## 5. Input Validation & Sanitization

### 5.1 Current Validations

| Route | Validation |
|-------|-----------|
| Register | Email + password required, unique email check |
| Paper Save | Metadata + questions array required, date validation |
| Paper Publish | `isPublishedOnline` must be boolean |
| Paper Submit | `studentName` + `responses` required |
| AI Parse | Text or files required |
| AI Variant | Questions array required, non-empty |
| Admin Approve | `userId` required |
| Paper Status | `paperId` + `newStatus` required, transition rules enforced |

### 5.2 XSS Protection

- **LaTeX rendering:** `safeLatexText()` function escapes `<` and `>` in non-math segments to prevent HTML injection via `react-latex-next` (which uses `dangerouslySetInnerHTML`).
- **React's default escaping:** JSX expressions are auto-escaped by React.

### 5.3 AI Output Sanitization

- **JSON escape sanitizer:** Custom character-by-character parser to fix invalid escape sequences from AI output (e.g., LaTeX `\text`, `\frac`).
- **MCQ option prefix stripping:** Regex removes leading `A.`, `(B)`, `iv.` patterns.
- **Markdown code block removal:** Strips `` ```json `` wrappers from AI responses.

---

## 6. API Security Measures

### 6.1 Rate Limiting (AI Routes)

| Mechanism | Implementation |
|-----------|----------------|
| Credit-based gating | Teachers must have credits > 0 to use AI routes |
| AI provider rate limits | Gemini API 429 errors caught and surfaced to user |
| Exponential backoff | 3 retries with 1s → 2s → 4s delays on transient errors |

### 6.2 Error Information Disclosure

| Concern | Status |
|---------|--------|
| Stack traces in production | ✅ Not exposed (generic error messages returned) |
| Database error details | ✅ Caught and replaced with generic messages |
| AI error details | ✅ Specific user-friendly messages for 503/429/500 |

---

## 7. Infrastructure Security

### 7.1 Deployment Security

| Component | Measure |
|-----------|---------|
| SSH access to VPS | SSH key authentication (via GitHub Secrets) |
| Environment secrets | Stored in GitHub Actions Secrets, not in codebase |
| `.env` file | Listed in `.gitignore` (not committed) |
| `node_modules` | Listed in `.gitignore` |

### 7.2 GitHub Actions Security

- Secrets injected at build time: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GEMINI_API_KEY`
- SSH key stored as `VPS_SSH_KEY` secret
- VPS connection via `appleboy/ssh-action@v1.0.3`

---

## 8. Known Security Gaps & Remediation Plan

> [!CAUTION]
> The following items must be addressed before production deployment.

| # | Gap | Severity | Remediation |
|---|-----|----------|-------------|
| 1 | **No CSRF protection** on API routes | 🔴 Critical | Implement CSRF tokens or SameSite cookie policy |
| 2 | **Credits endpoint has no payment verification** | 🔴 Critical | Integrate Stripe Checkout with webhook verification (currently mock) |
| 3 | **No rate limiting on auth endpoints** | 🔴 Critical | Add rate limiting to `/api/auth/register` and login to prevent brute force |
| 4 | **No email verification** on registration | 🟡 High | Add email verification flow before account activation |
| 5 | **No password complexity requirements** | 🟡 High | Enforce minimum 8 chars, mixed case, number |
| 6 | **No password reset flow** | 🟡 High | Implement forgot password with email token |
| 7 | **Student test submission is unauthenticated** | 🟡 High | Add CAPTCHA or simple auth to prevent spam submissions |
| 8 | **Admin portal has no audit logging** | 🟢 Medium | Log approval/rejection actions with timestamps and actor |
| 9 | **No Content Security Policy (CSP) headers** | 🟢 Medium | Add CSP, X-Frame-Options, X-Content-Type-Options headers |
| 10 | **JWT token doesn't refresh credit balance** | 🟢 Medium | Credits in token become stale; consider DB lookup on credit-sensitive actions (already done) |
| 11 | **`.env` file contains real secrets** | 🔴 Critical | Ensure `.env` is never committed; rotate all exposed secrets |

---

## 9. Security Checklist for Production Deployment

- [ ] **Rotate all secrets** — Database password, NEXTAUTH_SECRET, Gemini API key, Google OAuth secrets
- [ ] **Enforce HTTPS** — Ensure all routes redirect HTTP to HTTPS
- [ ] **Set secure cookie flags** — `HttpOnly`, `Secure`, `SameSite=Strict`
- [ ] **Add rate limiting** — Use middleware or reverse proxy (nginx) rate limiting
- [ ] **Enable CORS** — Restrict origins to production domain only
- [ ] **Add security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security
- [ ] **Implement Stripe webhooks** — Replace mock credit purchase with verified payment flow
- [ ] **Add CAPTCHA** — Google reCAPTCHA on registration and student test submission
- [ ] **Enable database backups** — Automated daily backups with point-in-time recovery
- [ ] **Set up monitoring** — Error tracking (Sentry), uptime monitoring, and alerting
- [ ] **Penetration testing** — Run OWASP ZAP or similar before launch
- [ ] **GDPR/Data privacy** — Add privacy policy, data deletion request mechanism
