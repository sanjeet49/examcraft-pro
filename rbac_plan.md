# ExamCraft Pro — Complete RBAC Design

> Deep analysis of the current codebase + your requirements = this full Role-Based Access Control blueprint.

---

## Part 1 — What You Have Today (Current State)

### Current Role Enum (in DB)
```
TEACHER  →  Default role on register
ADMIN    →  Principal / School admin
SUPER_ADMIN → Top-level school admin
```

### What's Working ✅
| Feature | Guard |
|---|---|
| Login / JWT session | ✅ NextAuth with role + isApproved in token |
| Admin portal page | ✅ Redirects non-ADMIN to /dashboard |
| User approval API | ✅ ADMIN + SUPER_ADMIN only |
| Paper status change | ✅ Role-checked in API |
| AI features | ✅ Credit-gated |

### Critical Gaps ❌
| Gap | Risk |
|---|---|
| Any person can self-register as any role — there is no role selector on register page, but the API also has no restriction | Anyone can call `/api/auth/register` with `role: "SUPER_ADMIN"` in the body |
| No `schoolId` on the User model — ADMIN of School A can approve TEACHER of School B | Data leakage across schools |
| No `OWNER` / platform-level role | You (Sanjeet) have no special access; SUPER_ADMIN is the highest role |
| No KYC / ID documents stored | No verification trail for Super Admins |
| SUPER_ADMIN deletion has no replacement guard | Deleting a SA leaves teachers with no approver |
| Registration page doesn't collect staff ID, address, phone | Can't verify identity |
| JWT token doesn't refresh role after approval | A freshly approved user must log out and back in |
| No `schoolId` scope on paper queries | Teachers could theoretically access other schools' papers if IDs are guessed |

---

## Part 2 — Your Proposed Role Hierarchy

```
OWNER (You — Sanjeet)
  └── SUPER_ADMIN (School-level head, KYC verified)
        └── ADMIN (Principal / school admin)
              └── TEACHER
```

### Role Definitions

| Role | Who | Created By | Approval |
|---|---|---|---|
| `OWNER` | Sanjeet Shrivastava only | Hard-coded / seed script | — |
| `SUPER_ADMIN` | School's official head (KYC verified) | Owner only | Owner manually after KYC docs |
| `ADMIN` | Principal | Super Admin | Super Admin approves |
| `TEACHER` | Teaching staff | Admin (or self-register with school code) | Admin approves |

---

## Part 3 — Database Schema Changes Required

### 3.1 New `School` Model

```prisma
model School {
  id          String   @id @default(cuid())
  name        String
  address     String?
  schoolCode  String   @unique  // e.g. "SCH-2345" — used on registration
  createdAt   DateTime @default(now())
  users       User[]
}
```

**Why:** Every user belongs to exactly one school. ADMIN can only see TEACHER of their own school. SUPER_ADMIN can only see ADMIN of their own school.

---

### 3.2 Updated `User` Model

```prisma
model User {
  id              String    @id @default(cuid())
  displayId       String    @unique  // AUTO_GENERATED: "ECP-0001"
  email           String    @unique
  password        String?
  name            String?             // Full legal name
  image           String?
  emailVerified   DateTime?

  // Role & Access
  role            String    @default("TEACHER")
  // Values: OWNER | SUPER_ADMIN | ADMIN | TEACHER
  isApproved      Boolean   @default(false)
  isPremium       Boolean   @default(false)
  credits         Int       @default(3)
  isActive        Boolean   @default(true)   // for soft-delete / revoke

  // School link
  schoolId        String?
  school          School?   @relation(fields: [schoolId], references: [id])

  // KYC / Identity fields
  phone           String?
  employeeId      String?
  idType          String?   // AADHAR | PAN | PASSPORT | VOTER | DRIVING_LICENCE
  idNumber        String?
  idDocUrl        String?   // uploaded doc URL
  currentAddress  String?
  permanentAddress String?

  // Trusty (guarantor) details - for ADMIN & TEACHER
  trustyName      String?
  trustyPhone     String?
  trustyEmail     String?
  trustyAddress   String?

  // Relations
  papers          Paper[]
  accounts        Account[]
  sessions        Session[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  approvedBy  String?   // userId of who approved this user
  approvedAt  DateTime?
}
```

---

## Part 4 — Registration Flow (Step by Step)

### 4.1 SUPER_ADMIN Registration
```
1. Goes to /register
2. Selects role: SUPER_ADMIN from dropdown
3. Fills full form:
   - Full legal name
   - Phone, Email
   - Employee ID + ID card upload
   - ID type + ID number
   - Current + permanent address
   - School Name (creates new School record)
4. Account created with isApproved: false
5. Owner (Sanjeet) receives notification → reviews KYC docs
6. Owner manually approves via /owner/dashboard
7. SUPER_ADMIN can now log in and access their school panel
```

### 4.2 ADMIN Registration (Principal)
```
1. Goes to /register
2. Selects role: ADMIN
3. Fills form + ENTERS SCHOOL CODE (given by Super Admin)
4. Also fills trusty details (guarantor / reference)
5. Account created with isApproved: false, schoolId = resolved from school code
6. Super Admin of that school sees pending request
7. Super Admin approves → ADMIN can access
```

### 4.3 TEACHER Registration
```
1. Goes to /register
2. Selects role: TEACHER
3. Fills form + ENTERS SCHOOL CODE
4. Account created with isApproved: false
5. Admin of that school approves
6. Teacher can create papers
```

---

## Part 5 — Permission Matrix (What Each Role Can Do)

| Action | OWNER | SUPER_ADMIN | ADMIN | TEACHER |
|---|:---:|:---:|:---:|:---:|
| Create/delete SUPER_ADMIN | ✅ | ❌ | ❌ | ❌ |
| View all schools | ✅ | ❌ | ❌ | ❌ |
| Approve SUPER_ADMIN | ✅ | ❌ | ❌ | ❌ |
| Revoke SUPER_ADMIN | ✅ | ❌ | ❌ | ❌ |
| Create/approve ADMIN (own school) | ❌ | ✅ | ❌ | ❌ |
| Revoke ADMIN | ❌ | ✅ | ❌ | ❌ |
| Create/approve TEACHER (own school) | ❌ | ✅ | ✅ | ❌ |
| Revoke TEACHER | ❌ | ✅ | ✅ | ❌ |
| View all teachers in own school | ❌ | ✅ | ✅ | ❌ |
| Create exam papers | ❌ | ✅ | ✅ | ✅ |
| Submit paper for approval | ❌ | ✅ | ✅ | ✅ |
| Approve paper (PENDING_ADMIN) | ❌ | ✅ | ✅ | ❌ |
| Final approve paper (PENDING_SUPERADMIN) | ❌ | ✅ | ❌ | ❌ |
| Publish paper online | ❌ | ✅ | ✅ (own) | ✅ (own) |
| Use AI features | credits | credits | credits | credits |
| View student submissions | own papers | all in school | all in school | own papers |

---

## Part 6 — SUPER_ADMIN Replacement (When Deleting)

**Your Question:** *"If I need to delete Super Admin, what happens?"*

**Answer — The Handover Rule:**

```
RULE: A SUPER_ADMIN account can only be deactivated (isActive: false),
      NEVER hard-deleted, as long as that school has papers/teachers under it.

SAFE DELETION STEPS (Owner does this):
1. Identify the school → schoolId
2. Create / promote another user to SUPER_ADMIN for the SAME schoolId
3. Only then deactivate the old SUPER_ADMIN (set isActive: false)
4. Old account becomes read-only historical record (name, ID, docs preserved)

DB RECORD KEPT:
  - champaklal (old SA) → isActive: false, role: SUPER_ADMIN, schoolId: SCH-2345
  - hiralal (new SA)    → isActive: true,  role: SUPER_ADMIN, schoolId: SCH-2345
```

> This ensures **audit trail is never broken** and teachers/admins always have an active approver.

---

## Part 7 — ID Generation System

| Role | Format | Example |
|---|---|---|
| School | `SCH-XXXX` (4-digit sequential) | `SCH-2345` |
| User | `ECP-XXXX` (sequential across all) | `ECP-1234` |

**Generation logic (server-side):**
```typescript
const lastUser = await prisma.user.findFirst({
  orderBy: { createdAt: 'desc' },
  select: { displayId: true }
});
const nextNum = lastUser
  ? parseInt(lastUser.displayId.split('-')[1]) + 1
  : 1001;
const displayId = `ECP-${String(nextNum).padStart(4, '0')}`;
```

---

## Part 8 — API Security Rules (Enforcement)

Every API route must follow this guard pattern:

```typescript
// lib/rbac.ts — reusable guard helpers
export const requireRole = (session: Session | null, ...roles: string[]) => {
  if (!session?.user) throw new UnauthorizedError();
  if (!roles.includes(session.user.role)) throw new ForbiddenError();
};

export const requireSameSchool = (session: Session | null, targetSchoolId: string) => {
  if (session?.user?.role === 'OWNER') return; // Owner sees all
  if (session?.user?.schoolId !== targetSchoolId) throw new ForbiddenError();
};
```

### Specific Guards Per Action

| API Route | Must check |
|---|---|
| `POST /api/auth/register` | Role in allowed list, schoolCode valid, no self-promotion to OWNER |
| `POST /api/admin/users/approve` | Caller role > target role, same schoolId |
| `POST /api/admin/users/revoke` | Same as approve |
| `POST /api/admin/papers/status` | ADMIN only for PENDING_ADMIN, SUPER_ADMIN for PENDING_SUPERADMIN |
| `GET/POST /api/paper/*` | userId === session.user.id OR same schoolId (for admins) |
| `GET /api/admin/users` | Filter by schoolId (non-OWNER) |

---

## Part 9 — KYC Document Storage

**Recommended approach:**
```
Upload to: Vercel Blob / Cloudinary / S3 (private bucket)
Store in User model: idDocUrl (signed URL, expires)
Access: Only OWNER and the user themselves
Retention: Minimum 7 years (compliance)
```

**Fields to collect per role:**
```
SUPER_ADMIN:  name, phone, email, employeeId, idType, idNumber, idDocUrl,
              currentAddress, permanentAddress
ADMIN:        + trustyName, trustyPhone, trustyEmail, trustyAddress
TEACHER:      + trustyName, trustyPhone (optional)
```

---

## Part 10 — Implementation Impact on SaaS Business

| Benefit | Explanation |
|---|---|
| **Multi-tenancy safety** | School A can never see School B's data — schoolId scoping ensures this |
| **Audit trail** | Every approval has approvedBy + approvedAt — you can prove who approved whom |
| **KYC compliance** | You're protected legally — verified identities for all elevated roles |
| **Scalability** | Add 1000 schools, each with their own SUPER_ADMIN, without code changes |
| **Trust signal** | Schools will trust a platform that does real identity verification |
| **Soft delete** | isActive = false means no data loss, full history preserved |
| **Revenue protection** | Credit system + role-gating prevents abuse of AI features |

---

## Part 11 — Implementation Phases (Recommended Order)

### Phase 1 — Schema & Auth (Foundation) 🏗️
- [ ] Add `School` model to Prisma
- [ ] Add all new fields to `User` model (displayId, phone, schoolId, KYC fields, trusty)
- [ ] Add `OWNER` role check utilities
- [ ] Seed OWNER account (your account, hardcoded email)
- [ ] Update JWT callback to include `schoolId`

### Phase 2 — Registration Flow 📝
- [ ] Rebuild `/register` page with role selector + dynamic fields
- [ ] Register API validates role chain (no self-promotion to OWNER/SUPER_ADMIN without approval)
- [ ] School code lookup on ADMIN/TEACHER registration
- [ ] ID document upload integration

### Phase 3 — Owner Dashboard 👑
- [ ] `/owner/dashboard` — list all schools, all SUPER_ADMINs
- [ ] Approve/revoke SUPER_ADMIN
- [ ] View KYC documents
- [ ] Create new school

### Phase 4 — School-Scoped Admin Portal 🏫
- [ ] Update admin page to filter by schoolId
- [ ] SUPER_ADMIN can manage ADMINs of own school
- [ ] ADMIN can manage TEACHERs of own school
- [ ] Handover flow for SUPER_ADMIN replacement

### Phase 5 — API Hardening 🔒
- [ ] Add schoolId scope guards to all API routes
- [ ] Add role hierarchy validation to approve/revoke APIs
- [ ] Prevent privilege escalation (ADMIN cannot approve another ADMIN)

---

## Summary — What to Tell Your Team

> "ExamCraft Pro will use a **4-level hierarchical RBAC** with **school-scoped data isolation**.
> Every user belongs to one school. Roles cascade downward — you can only manage roles below yours.
> No role can be self-assigned above TEACHER. SUPER_ADMIN requires KYC verification by the platform Owner.
> All accounts are soft-deleted (never hard deleted) to preserve audit trails."

