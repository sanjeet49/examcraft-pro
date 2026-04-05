"use client";

import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    ChevronRight, ChevronLeft, GraduationCap, Shield, ShieldCheck, Upload,
    Eye, EyeOff, Loader2, CheckCircle2, School, User, Phone, IdCard, MapPin, Users
} from "lucide-react";

type Role = "TEACHER" | "ADMIN" | "SUPER_ADMIN";

const ROLES = [
    {
        id: "TEACHER" as Role,
        label: "Teacher",
        description: "Create exam papers and submit for approval",
        icon: GraduationCap,
        color: "from-blue-500 to-cyan-500",
        bg: "bg-blue-50 border-blue-200",
        selectedBg: "bg-blue-600 border-blue-600",
    },
    {
        id: "ADMIN" as Role,
        label: "Admin / Principal",
        description: "Manage teachers and approve exam papers",
        icon: Shield,
        color: "from-violet-500 to-purple-500",
        bg: "bg-violet-50 border-violet-200",
        selectedBg: "bg-violet-600 border-violet-600",
    },
    {
        id: "SUPER_ADMIN" as Role,
        label: "Super Admin",
        description: "School head — manage admins and staff (KYC required)",
        icon: ShieldCheck,
        color: "from-amber-500 to-orange-500",
        bg: "bg-amber-50 border-amber-200",
        selectedBg: "bg-amber-600 border-amber-600",
    },
];

const ID_TYPES = ["AADHAR", "PAN", "PASSPORT", "VOTER_ID", "DRIVING_LICENCE"];

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1=role, 2=basic, 3=school, 4=kyc (SA/Admin)
    const [loading, setLoading] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        role: "" as Role | "",
        name: "",
        email: "",
        password: "",
        phone: "",
        // school
        schoolCode: "",
        schoolName: "",
        schoolAddress: "",
        // KYC
        employeeId: "",
        idType: "",
        idNumber: "",
        idDocUrl: "",
        currentAddress: "",
        permanentAddress: "",
        // Trusty
        trustyName: "",
        trustyPhone: "",
        trustyEmail: "",
        trustyAddress: "",
    });

    const set = (key: keyof typeof form, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    const selectedRole = ROLES.find((r) => r.id === form.role);

    const totalSteps = form.role === "SUPER_ADMIN" ? 4 : form.role === "ADMIN" ? 4 : 3;

    // ─── File Upload ───────────────────────────────────────────────────────────
    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingDoc(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || "Upload failed");
            }
            const { url } = await res.json();
            set("idDocUrl", url);
            toast.success("Document uploaded successfully!");
        } catch (err: any) {
            toast.error(err.message || "Upload failed");
        } finally {
            setUploadingDoc(false);
        }
    };

    // ─── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Registration failed");
            toast.success(data.message || "Account created!");
            router.push("/login");
        } catch (err: any) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // ─── Validation per step ──────────────────────────────────────────────────
    const canProceed = () => {
        if (step === 1) return !!form.role;
        if (step === 2) return form.name.trim() && form.email.trim() && form.password.length >= 8 && form.phone.trim();
        if (step === 3) {
            if (form.role === "SUPER_ADMIN") return form.schoolName.trim() !== "";
            return form.schoolCode.trim() !== "";
        }
        // step 4 (KYC) — doc upload optional for now, but fields required
        if (form.role === "SUPER_ADMIN") return form.idType && form.idNumber;
        return true; // ADMIN trusty is optional
    };

    // ─── Progress indicators ──────────────────────────────────────────────────
    const stepLabels =
        form.role === "SUPER_ADMIN"
            ? ["Role", "Personal", "School", "KYC"]
            : form.role === "ADMIN"
            ? ["Role", "Personal", "School", "Guarantor"]
            : ["Role", "Personal", "School"];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
                        <GraduationCap className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">ExamCraft Pro</h1>
                    <p className="text-indigo-300 mt-1">Create your account</p>
                </div>

                {/* Step Progress */}
                {form.role && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {stepLabels.map((label, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                                    i + 1 < step
                                        ? "bg-emerald-500 text-white"
                                        : i + 1 === step
                                        ? "bg-indigo-500 text-white"
                                        : "bg-white/10 text-white/40"
                                }`}>
                                    {i + 1 < step ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
                                    {label}
                                </div>
                                {i < stepLabels.length - 1 && (
                                    <div className={`w-4 h-px ${i + 1 < step ? "bg-emerald-400" : "bg-white/20"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* ── Step 1: Role Selection ── */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-6">What's your role?</h2>
                            {ROLES.map((role) => {
                                const Icon = role.icon;
                                const selected = form.role === role.id;
                                return (
                                    <button
                                        key={role.id}
                                        onClick={() => set("role", role.id)}
                                        className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                            selected
                                                ? "border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/20"
                                                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                                        }`}
                                    >
                                        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${role.color} flex-shrink-0`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{role.label}</p>
                                            <p className="text-sm text-white/60 mt-0.5">{role.description}</p>
                                        </div>
                                        {selected && <CheckCircle2 className="w-5 h-5 text-indigo-400 ml-auto flex-shrink-0 mt-1" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Step 2: Personal Info ── */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-2">Personal Information</h2>
                            <p className="text-white/50 text-sm mb-6">Registering as: <span className="text-indigo-400 font-medium">{selectedRole?.label}</span></p>

                            <FormField label="Full Legal Name" icon={<User className="w-4 h-4" />}>
                                <input
                                    type="text" placeholder="e.g. Ramesh Kumar Sharma"
                                    className={inputCls}
                                    value={form.name} onChange={(e) => set("name", e.target.value)}
                                />
                            </FormField>

                            <FormField label="Email Address" icon={<span className="text-sm">@</span>}>
                                <input
                                    type="email" placeholder="you@school.edu"
                                    className={inputCls}
                                    value={form.email} onChange={(e) => set("email", e.target.value)}
                                />
                            </FormField>

                            <FormField label="Phone Number" icon={<Phone className="w-4 h-4" />}>
                                <input
                                    type="tel" placeholder="+91 98765 43210"
                                    className={inputCls}
                                    value={form.phone} onChange={(e) => set("phone", e.target.value)}
                                />
                            </FormField>

                            <FormField label="Password" icon={<span className="text-sm">🔑</span>}>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Min. 8 characters"
                                        className={`${inputCls} pr-10`}
                                        value={form.password} onChange={(e) => set("password", e.target.value)}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </FormField>
                        </div>
                    )}

                    {/* ── Step 3: School Info ── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-6">
                                {form.role === "SUPER_ADMIN" ? "Register Your School" : "Link to Your School"}
                            </h2>

                            {form.role === "SUPER_ADMIN" ? (
                                <>
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300 mb-4">
                                        A new school account will be created. You will receive a unique <strong>School Code</strong> to share with your Admins and Teachers.
                                    </div>
                                    <FormField label="School / Institution Name" icon={<School className="w-4 h-4" />}>
                                        <input type="text" placeholder="e.g. Delhi Public School" className={inputCls}
                                            value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} />
                                    </FormField>
                                    <FormField label="School Address (optional)" icon={<MapPin className="w-4 h-4" />}>
                                        <textarea rows={2} placeholder="Full postal address" className={`${inputCls} resize-none`}
                                            value={form.schoolAddress} onChange={(e) => set("schoolAddress", e.target.value)} />
                                    </FormField>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-300 mb-4">
                                        Enter the <strong>School Code</strong> provided by your{" "}
                                        {form.role === "ADMIN" ? "Super Admin" : "Admin or Super Admin"}.
                                    </div>
                                    <FormField label="School Code" icon={<School className="w-4 h-4" />}>
                                        <input type="text" placeholder="e.g. SCH-1001"
                                            className={`${inputCls} uppercase tracking-widest font-mono`}
                                            value={form.schoolCode}
                                            onChange={(e) => set("schoolCode", e.target.value.toUpperCase())} />
                                    </FormField>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Step 4: KYC (SUPER_ADMIN) or Guarantor (ADMIN) ── */}
                    {step === 4 && form.role === "SUPER_ADMIN" && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-2">Identity Verification (KYC)</h2>
                            <p className="text-white/50 text-sm mb-4">Required for Super Admin approval. Documents are stored securely.</p>

                            <FormField label="Employee / Staff ID" icon={<IdCard className="w-4 h-4" />}>
                                <input type="text" placeholder="Your official staff/employee ID" className={inputCls}
                                    value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} />
                            </FormField>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="ID Type" icon={null}>
                                    <select className={inputCls} value={form.idType} onChange={(e) => set("idType", e.target.value)}>
                                        <option value="">Select ID type</option>
                                        {ID_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="ID Number" icon={null}>
                                    <input type="text" placeholder="ID number" className={inputCls}
                                        value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />
                                </FormField>
                            </div>

                            {/* Document Upload */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">ID Document Upload</label>
                                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleDocUpload} />
                                {form.idDocUrl ? (
                                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        <span className="text-sm text-emerald-300">Document uploaded successfully</span>
                                        <button onClick={() => set("idDocUrl", "")} className="ml-auto text-white/40 hover:text-white/70 text-xs">Remove</button>
                                    </div>
                                ) : (
                                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}
                                        className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-indigo-400 hover:bg-indigo-500/5 transition-all">
                                        {uploadingDoc ? (
                                            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                                        ) : (
                                            <Upload className="w-6 h-6 text-white/40" />
                                        )}
                                        <span className="text-sm text-white/50">{uploadingDoc ? "Uploading..." : "Click to upload JPG, PNG, or PDF (max 5MB)"}</span>
                                    </button>
                                )}
                            </div>

                            <FormField label="Current Address" icon={<MapPin className="w-4 h-4" />}>
                                <textarea rows={2} placeholder="Current residential address" className={`${inputCls} resize-none`}
                                    value={form.currentAddress} onChange={(e) => set("currentAddress", e.target.value)} />
                            </FormField>
                            <FormField label="Permanent Address" icon={<MapPin className="w-4 h-4" />}>
                                <textarea rows={2} placeholder="Permanent/home address" className={`${inputCls} resize-none`}
                                    value={form.permanentAddress} onChange={(e) => set("permanentAddress", e.target.value)} />
                            </FormField>
                        </div>
                    )}

                    {step === 4 && form.role === "ADMIN" && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-2">Guarantor / Reference Details</h2>
                            <p className="text-white/50 text-sm mb-4">Provide details of a guarantor who can vouch for you.</p>

                            <FormField label="Guarantor Full Name" icon={<Users className="w-4 h-4" />}>
                                <input type="text" placeholder="Full name" className={inputCls}
                                    value={form.trustyName} onChange={(e) => set("trustyName", e.target.value)} />
                            </FormField>
                            <FormField label="Guarantor Phone" icon={<Phone className="w-4 h-4" />}>
                                <input type="tel" placeholder="+91 98765 43210" className={inputCls}
                                    value={form.trustyPhone} onChange={(e) => set("trustyPhone", e.target.value)} />
                            </FormField>
                            <FormField label="Guarantor Email" icon={<span className="text-sm">@</span>}>
                                <input type="email" placeholder="guarantor@example.com" className={inputCls}
                                    value={form.trustyEmail} onChange={(e) => set("trustyEmail", e.target.value)} />
                            </FormField>
                            <FormField label="Guarantor Address" icon={<MapPin className="w-4 h-4" />}>
                                <textarea rows={2} placeholder="Full address" className={`${inputCls} resize-none`}
                                    value={form.trustyAddress} onChange={(e) => set("trustyAddress", e.target.value)} />
                            </FormField>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className={`flex gap-3 mt-8 ${step > 1 ? "justify-between" : "justify-end"}`}>
                        {step > 1 && (
                            <button onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                        )}
                        {step < totalSteps ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={!canProceed()}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/20">
                                Continue <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !canProceed()}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all shadow-lg shadow-emerald-500/20">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {loading ? "Creating Account..." : "Create Account"}
                            </button>
                        )}
                    </div>

                    {/* Google Sign-In (step 1 only) */}
                    {step === 1 && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                                <div className="relative flex justify-center text-xs"><span className="bg-transparent px-3 text-white/40">or sign up with</span></div>
                            </div>
                            <button
                                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </button>
                        </>
                    )}
                </div>

                <p className="text-center text-white/40 text-sm mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
                </p>
            </div>
        </div>
    );
}

// ─── Mini Components ──────────────────────────────────────────────────────────
function FormField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-1.5">
                {icon && <span className="text-white/40">{icon}</span>}
                {label}
            </label>
            {children}
        </div>
    );
}

const inputCls = `w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`;
