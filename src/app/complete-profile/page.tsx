"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    GraduationCap, Shield, ShieldCheck, ChevronRight, ChevronLeft,
    CheckCircle2, Upload, Loader2, School, Phone, IdCard, MapPin, Users, Eye, EyeOff
} from "lucide-react";

type Role = "TEACHER" | "ADMIN" | "SUPER_ADMIN";

const ROLES = [
    { id: "TEACHER" as Role, label: "Teacher", desc: "Create exam papers and submit for approval", icon: GraduationCap, color: "from-blue-500 to-cyan-500" },
    { id: "ADMIN" as Role, label: "Admin / Principal", desc: "Manage teachers and approve exam papers", icon: Shield, color: "from-violet-500 to-purple-500" },
    { id: "SUPER_ADMIN" as Role, label: "Super Admin", desc: "School head — manage admins and staff (KYC required)", icon: ShieldCheck, color: "from-amber-500 to-orange-500" },
];

const ID_TYPES = ["AADHAR", "PAN", "PASSPORT", "VOTER_ID", "DRIVING_LICENCE"];

export default function CompleteProfilePage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        role: "" as Role | "",
        phone: "",
        schoolCode: "",
        schoolName: "",
        schoolAddress: "",
        employeeId: "",
        idType: "",
        idNumber: "",
        idDocUrl: "",
        currentAddress: "",
        permanentAddress: "",
        trustyName: "",
        trustyPhone: "",
        trustyEmail: "",
        trustyAddress: "",
    });

    const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

    const totalSteps = form.role === "SUPER_ADMIN" ? 4 : form.role === "ADMIN" ? 4 : 3;
    const stepLabels =
        form.role === "SUPER_ADMIN"
            ? ["Role", "Personal", "School", "KYC"]
            : form.role === "ADMIN"
            ? ["Role", "Personal", "School", "Guarantor"]
            : ["Role", "Personal", "School"];

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingDoc(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
            const { url } = await res.json();
            set("idDocUrl", url);
            toast.success("Document uploaded!");
        } catch (err: any) {
            toast.error(err.message || "Upload failed");
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/user/complete-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed");
            toast.success(data.message || "Profile completed!");
            await update(); // refresh JWT
            router.push("/dashboard");
        } catch (err: any) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const canProceed = () => {
        if (step === 1) return !!form.role;
        if (step === 2) return form.phone.trim() !== "";
        if (step === 3) {
            if (form.role === "SUPER_ADMIN") return form.schoolName.trim() !== "";
            return form.schoolCode.trim() !== "";
        }
        if (form.role === "SUPER_ADMIN") return !!(form.idType && form.idNumber);
        return true;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
                        <GraduationCap className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Complete Your Profile</h1>
                    <p className="text-indigo-300 mt-1">
                        Welcome, <span className="font-medium">{session?.user?.name || session?.user?.email}</span>! Set up your role to continue.
                    </p>
                </div>

                {form.role && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {stepLabels.map((label, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                                    i + 1 < step ? "bg-emerald-500 text-white" : i + 1 === step ? "bg-indigo-500 text-white" : "bg-white/10 text-white/40"
                                }`}>
                                    {i + 1 < step ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
                                    {label}
                                </div>
                                {i < stepLabels.length - 1 && <div className={`w-4 h-px ${i + 1 < step ? "bg-emerald-400" : "bg-white/20"}`} />}
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-6">What's your role?</h2>
                            {ROLES.map((role) => {
                                const Icon = role.icon;
                                const selected = form.role === role.id;
                                return (
                                    <button key={role.id} onClick={() => set("role", role.id)}
                                        className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                                            selected ? "border-indigo-500 bg-indigo-500/20" : "border-white/10 bg-white/5 hover:border-white/20"
                                        }`}>
                                        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${role.color} flex-shrink-0`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{role.label}</p>
                                            <p className="text-sm text-white/60 mt-0.5">{role.desc}</p>
                                        </div>
                                        {selected && <CheckCircle2 className="w-5 h-5 text-indigo-400 ml-auto flex-shrink-0 mt-1" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-6">Contact Information</h2>
                            <div>
                                <label className="text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5"><Phone className="w-4 h-4 text-white/40" /> Phone Number</label>
                                <input type="tel" placeholder="+91 98765 43210" className={inputCls}
                                    value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-6">
                                {form.role === "SUPER_ADMIN" ? "Register Your School" : "Link to Your School"}
                            </h2>
                            {form.role === "SUPER_ADMIN" ? (
                                <>
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
                                        A new school will be created. You'll receive a School Code to share with your staff.
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5"><School className="w-4 h-4 text-white/40" /> School Name</label>
                                        <input type="text" placeholder="e.g. Delhi Public School" className={inputCls}
                                            value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-white/40" /> School Address (optional)</label>
                                        <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Postal address"
                                            value={form.schoolAddress} onChange={(e) => set("schoolAddress", e.target.value)} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-300">
                                        Enter the School Code from your {form.role === "ADMIN" ? "Super Admin" : "Admin"}.
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5"><School className="w-4 h-4 text-white/40" /> School Code</label>
                                        <input type="text" placeholder="e.g. SCH-1001" className={`${inputCls} uppercase tracking-widest font-mono`}
                                            value={form.schoolCode} onChange={(e) => set("schoolCode", e.target.value.toUpperCase())} />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 4 && form.role === "SUPER_ADMIN" && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-2">KYC Verification</h2>
                            <p className="text-white/50 text-sm mb-4">Required for Super Admin approval.</p>
                            <div>
                                <label className="text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5"><IdCard className="w-4 h-4 text-white/40" /> Employee / Staff ID</label>
                                <input type="text" placeholder="Official staff ID" className={inputCls}
                                    value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium text-white/70 mb-1.5 block">ID Type</label>
                                    <select className={inputCls} value={form.idType} onChange={(e) => set("idType", e.target.value)}>
                                        <option value="">Select</option>
                                        {ID_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white/70 mb-1.5 block">ID Number</label>
                                    <input type="text" placeholder="ID number" className={inputCls}
                                        value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleDocUpload} />
                            {form.idDocUrl ? (
                                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    <span className="text-sm text-emerald-300">Document uploaded</span>
                                    <button onClick={() => set("idDocUrl", "")} className="ml-auto text-white/40 text-xs hover:text-white/70">Remove</button>
                                </div>
                            ) : (
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}
                                    className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-white/20 rounded-xl hover:border-indigo-400 transition-all">
                                    {uploadingDoc ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /> : <Upload className="w-6 h-6 text-white/40" />}
                                    <span className="text-sm text-white/50">{uploadingDoc ? "Uploading..." : "Upload ID Document (JPG/PNG/PDF, max 5MB)"}</span>
                                </button>
                            )}
                            <div>
                                <label className="text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-white/40" /> Current Address</label>
                                <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Current address"
                                    value={form.currentAddress} onChange={(e) => set("currentAddress", e.target.value)} />
                            </div>
                        </div>
                    )}

                    {step === 4 && form.role === "ADMIN" && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-white mb-2">Guarantor Details</h2>
                            <p className="text-white/50 text-sm mb-4">A person who can vouch for you (optional).</p>
                            {[
                                { key: "trustyName", label: "Full Name", icon: <Users className="w-4 h-4 text-white/40" />, type: "text", placeholder: "Full name" },
                                { key: "trustyPhone", label: "Phone", icon: <Phone className="w-4 h-4 text-white/40" />, type: "tel", placeholder: "+91..." },
                                { key: "trustyEmail", label: "Email", icon: <span className="text-sm text-white/40">@</span>, type: "email", placeholder: "email@example.com" },
                            ].map(({ key, label, icon, type, placeholder }) => (
                                <div key={key}>
                                    <label className="text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">{icon} {label}</label>
                                    <input type={type} placeholder={placeholder} className={inputCls}
                                        value={(form as any)[key]} onChange={(e) => set(key as keyof typeof form, e.target.value)} />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={`flex gap-3 mt-8 ${step > 1 ? "justify-between" : "justify-end"}`}>
                        {step > 1 && (
                            <button onClick={() => setStep((s) => s - 1)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                        )}
                        {step < totalSteps ? (
                            <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all">
                                Continue <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading || !canProceed()}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {loading ? "Saving..." : "Complete Setup"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const inputCls = `w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all`;
