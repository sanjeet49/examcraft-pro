"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import getCroppedImg from "@/lib/cropUtils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AvatarCropperProps {
    imageSrc: string | null;
    open: boolean;
    onClose: () => void;
    onCropDone: (croppedFile: File) => Promise<void>;
}

export function AvatarCropper({ imageSrc, open, onClose, onCropDone }: AvatarCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        
        setIsSaving(true);
        try {
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
            if (croppedFile) {
                await onCropDone(croppedFile);
            } else {
                throw new Error("Failed to crop image context.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to crop image.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Frame Your Avatar</DialogTitle>
                    <DialogDescription className="text-slate-400">Drag to position the image exactly inside the circle. Scroll or use the slider to zoom.</DialogDescription>
                </DialogHeader>

                <div className="relative w-full h-[300px] sm:h-[400px] mt-2 rounded-xl overflow-hidden bg-black ring-2 ring-white/10">
                    {imageSrc && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    )}
                </div>

                <div className="flex items-center gap-4 my-2 px-2">
                    <span className="text-xs text-slate-400">Zoom</span>
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 accent-amber-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving} className="text-slate-300 hover:text-white hover:bg-white/10">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                        {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Apply & Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
