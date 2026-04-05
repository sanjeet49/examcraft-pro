"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, CreditCard, Sparkles, CheckCircle2, School, Copy, ShieldCheck, Clock, User, Lock, Upload, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarCropper } from "@/components/ui/avatar-cropper";

export default function SettingsPage() {
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState<number | null>(null);
    const [schoolInfo, setSchoolInfo] = useState<{ name: string; schoolCode: string } | null>(null);
    const router = useRouter();

    // Profile State
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    
    // Avatar upload
    const [uploadingImage, setUploadingImage] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    useEffect(() => {
        if (session?.user) {
            setName(session.user.name || "");
            setPhone((session.user as any).phone || "");
        }
    }, [session]);

    // Fetch school info for SUPER_ADMIN/ADMIN/TEACHER
    useEffect(() => {
        const schoolId = (session?.user as any)?.schoolId;
        if (!schoolId) return;
        fetch(`/api/owner/schools?id=${schoolId}`)
            .then((r) => r.json())
            .then((d) => { if (d.school) setSchoolInfo(d.school); })
            .catch(() => {});
    }, [session]);

    const handleBuyCredits = async (amount: number, planId: number) => {
        setLoading(planId);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const res = await fetch("/api/user/credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });
            if (!res.ok) throw new Error("Payment failed");
            const data = await res.json();
            await update();
            toast.success(`Payment successful! Added ${amount} credits securely.`);
            router.refresh();
        } catch (e) {
            toast.error("Mock Stripe Checkout failed.");
        } finally {
            setLoading(null);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingProfile(true);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone }),
            });
            if (!res.ok) throw new Error("Failed to update profile");
            await update(); // Trigger session refresh
            toast.success("Profile updated successfully!");
        } catch (e: any) {
            toast.error(e.message || "Could not update profile.");
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Clean up previous URL if it exists
        if (imageToCrop) {
            URL.revokeObjectURL(imageToCrop);
        }

        const imageUrl = URL.createObjectURL(file);
        setImageToCrop(imageUrl);
        setCropModalOpen(true);
        e.target.value = "";
    };

    const handleUploadCroppedImage = async (croppedFile: File) => {
        setCropModalOpen(false);
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", croppedFile);
            
            // Upload to Cloudinary via existing route
            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });
            
            if (!uploadRes.ok) throw new Error("Failed to upload image");
            
            const uploadData = await uploadRes.json();
            const imageUrl = uploadData.url;

            // Save to Profile
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: imageUrl }),
            });
            
            if (!res.ok) throw new Error("Failed to save image to profile");
            
            await update();
            toast.success("Profile picture updated!");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to upload image.");
        } finally {
            setUploadingImage(false);
            if (imageToCrop) {
                URL.revokeObjectURL(imageToCrop);
                setImageToCrop(null);
            }
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const res = await fetch("/api/user/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to update password");
            
            toast.success("Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e: any) {
            toast.error(e.message || "Could not update password.");
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                <p className="text-gray-500 mt-2">Manage your profile, security, and billing preferences.</p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="profile" className="flex items-center gap-2"><User className="w-4 h-4"/> Profile Identity</TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2"><Lock className="w-4 h-4"/> Security</TabsTrigger>
                    <TabsTrigger value="billing" className="flex items-center gap-2"><CreditCard className="w-4 h-4"/> Billing & School</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>Update your personal information and how others see you.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Avatar Upload */}
                            <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-indigo-100 border-4 border-white shadow flex items-center justify-center overflow-hidden relative group">
                                        {session?.user?.image ? (
                                            <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-bold text-indigo-400">{session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase()}</span>
                                        )}
                                        
                                        <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploadingImage ? 'opacity-100 bg-black/60' : ''}`}
                                            onClick={() => !uploadingImage && fileInputRef.current?.click()}>
                                            {uploadingImage ? (
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <>
                                                    <Camera className="w-6 h-6 mb-1" />
                                                    <span className="text-xs font-semibold">Change</span>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-gray-900">Profile Picture</h3>
                                    <p className="text-sm text-gray-500">Click the avatar to upload a professional headshot. Recommended size 400x400px.</p>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                                </div>
                                <div className="space-y-2 pb-2">
                                    <Label>Email <span className="text-xs font-normal text-gray-400 ml-2">(Cannot be changed)</span></Label>
                                    <Input value={session?.user?.email || ""} disabled className="bg-gray-50" />
                                </div>
                                <Button type="submit" disabled={isUpdatingProfile} className="bg-indigo-600 hover:bg-indigo-700">
                                    {isUpdatingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Profile Changes
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Avatar Cropper Modal for Tenant */}
                <AvatarCropper 
                    imageSrc={imageToCrop} 
                    open={cropModalOpen} 
                    onClose={() => setCropModalOpen(false)} 
                    onCropDone={handleUploadCroppedImage} 
                />

                <TabsContent value="security" className="space-y-6">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>If you signed up with Google, leave current password blank to establish a local password.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <Label>Current Password (Optional if OAuth)</Label>
                                    <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} placeholder="••••••••" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirm New Password</Label>
                                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} placeholder="••••••••" required />
                                </div>
                                <Button type="submit" disabled={isUpdatingPassword} variant="default" className="w-full">
                                    {isUpdatingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Update Security Credentials
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Status Card */}
                        <Card className="md:col-span-1 shadow-sm border-gray-200">
                            <CardHeader>
                                <CardTitle>Platform Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-gray-500 text-xs uppercase tracking-wider">Plan</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${session?.user?.isPremium ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {session?.user?.isPremium ? 'PRO MEMBER' : 'FREE TIER'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-500 text-xs uppercase tracking-wider">Role</Label>
                                    <p className="font-medium capitalize">{session?.user?.role?.replace("_", " ")}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-500 text-xs uppercase tracking-wider">Display ID</Label>
                                    <p className="font-mono text-sm text-indigo-700 font-semibold">{(session?.user as any)?.displayId || "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-500 text-xs uppercase tracking-wider">Account Status</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        {session?.user?.isApproved ? (
                                            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                                                <ShieldCheck className="w-4 h-4" /> Approved
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                                                <Clock className="w-4 h-4" /> Pending Approval
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* School Info */}
                        {schoolInfo && (
                            <Card className="md:col-span-1 shadow-sm border-indigo-100">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <School className="w-5 h-5 text-indigo-600" />
                                        <CardTitle>School Directives</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label className="text-gray-500 text-xs uppercase tracking-wider">School Name</Label>
                                        <p className="font-medium">{schoolInfo.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-gray-500 text-xs uppercase tracking-wider">School Code</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="bg-indigo-50 text-indigo-700 font-mono font-bold text-sm px-3 py-1.5 rounded-lg border border-indigo-200 tracking-widest">
                                                {schoolInfo.schoolCode}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(schoolInfo.schoolCode);
                                                    toast.success("School code copied!");
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Copy school code"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {(session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN") && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Share this code with {session?.user?.role === "SUPER_ADMIN" ? "Admins/Teachers" : "Teachers"} for onboarding.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Topup Info - ONLY SUPER_ADMIN */}
                        {session?.user?.role === "SUPER_ADMIN" && (
                            <div className="md:col-span-3 space-y-4 mt-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Top-up Credits</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                    {/* Starter Pack */}
                                    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Starter Pack</CardTitle>
                                            <CardDescription>Perfect for occasion paper generation.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold mb-4">$5 <span className="text-sm font-normal text-gray-500">/ one-time</span></div>
                                            <ul className="space-y-2 text-sm text-gray-600 mb-6">
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 10 Exam Credits</li>
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unlimited DOCX/PDF Exports</li>
                                            </ul>
                                            <Button
                                                className="w-full bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                                                onClick={() => handleBuyCredits(10, 1)}
                                                disabled={loading !== null}
                                            >
                                                {loading === 1 ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                                                {loading === 1 ? "Processing..." : "Buy 10 Credits"}
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {/* Pro Pack */}
                                    <Card className="border-indigo-200 shadow-md bg-indigo-50/30 relative overflow-hidden ring-1 ring-indigo-500">
                                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" /> BEST VALUE
                                        </div>
                                        <CardHeader>
                                            <CardTitle className="text-lg text-indigo-900">Pro Teacher Pack</CardTitle>
                                            <CardDescription>For heavy-duty exam generation.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-indigo-900 mb-4">$20 <span className="text-sm font-normal text-gray-500">/ one-time</span></div>
                                            <ul className="space-y-2 text-sm text-indigo-800 mb-6">
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> 50 Exam Credits</li>
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Priority AI Generation</li>
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Premium Templates</li>
                                            </ul>
                                            <Button
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                                                onClick={() => handleBuyCredits(50, 2)}
                                                disabled={loading !== null}
                                            >
                                                {loading === 2 ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                                                {loading === 2 ? "Processing..." : "Buy 50 Credits"}
                                            </Button>
                                        </CardContent>
                                    </Card>

                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={`font-semibold ${className}`}>{children}</div>;
}
