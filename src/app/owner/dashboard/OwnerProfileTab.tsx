"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Camera, Lock, User, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarCropper } from "@/components/ui/avatar-cropper";

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={`text-sm font-semibold text-slate-300 ${className}`}>{children}</div>;
}

export function OwnerProfileTab() {
    const { data: session, update } = useSession();
    
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    
    const [uploadingImage, setUploadingImage] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            await update();
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
            
            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });
            
            if (!uploadRes.ok) throw new Error("Failed to upload image");
            
            const uploadData = await uploadRes.json();
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: uploadData.url }),
            });
            
            if (!res.ok) throw new Error("Failed to save image to profile");
            
            await update();
            toast.success("Profile picture updated!");
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
            
            toast.success("Master password updated successfully!");
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
            {/* Left Column: Profile */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                    <User className="w-5 h-5 text-amber-500" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Master Identity</h2>
                        <p className="text-xs text-slate-400">Personal information associated with the Owner.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center overflow-hidden relative group">
                            {session?.user?.image ? (
                                <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-amber-400">{session?.user?.name?.[0] || "O"}</span>
                            )}
                            
                            <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploadingImage ? 'opacity-100 bg-black/80' : ''}`}
                                onClick={() => !uploadingImage && fileInputRef.current?.click()}>
                                {uploadingImage ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <Camera className="w-6 h-6 mb-1 text-amber-400" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                                    </>
                                )}
                            </div>
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Profile Photo</h3>
                        <p className="text-sm text-slate-400 max-w-xs mt-1">Upload a professional avatar. This will be displayed in the Owner Portal.</p>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} className="bg-black/20 border-white/10 text-white placeholder:text-slate-500" />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-black/20 border-white/10 text-white placeholder:text-slate-500" />
                    </div>
                    <div className="space-y-2 pb-4">
                        <Label>Master Email</Label>
                        <Input value={session?.user?.email || ""} disabled className="bg-white/5 border-white/5 text-slate-400" />
                        <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> The master email cannot be changed for security.</p>
                    </div>
                    <Button type="submit" disabled={isUpdatingProfile} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold">
                        {isUpdatingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Identity Changes
                    </Button>
                </form>
            </div>

            {/* Right Column: Security */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit bg-gradient-to-b from-transparent to-red-950/10 border-b-red-500/20">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                    <Lock className="w-5 h-5 text-red-400" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Platform Security</h2>
                        <p className="text-xs text-slate-400">Update your Master Password.</p>
                    </div>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-5">
                    <div className="space-y-2">
                        <Label>Current Master Password</Label>
                        <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="bg-black/20 border-white/10 text-white placeholder:text-slate-500" />
                    </div>
                    <div className="space-y-2">
                        <Label>New Master Password</Label>
                        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} required className="bg-black/20 border-white/10 text-white placeholder:text-slate-500" />
                    </div>
                    <div className="space-y-2 pb-4">
                        <Label>Confirm New Password</Label>
                        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} required className="bg-black/20 border-white/10 text-white placeholder:text-slate-500" />
                    </div>
                    <Button type="submit" disabled={isUpdatingPassword} variant="destructive" className="w-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
                        {isUpdatingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Update Security Credentials
                    </Button>
                </form>
            </div>

            {/* Custom Modal Cropper */}
            <AvatarCropper 
                imageSrc={imageToCrop} 
                open={cropModalOpen} 
                onClose={() => setCropModalOpen(false)} 
                onCropDone={handleUploadCroppedImage} 
            />
        </div>
    );
}
