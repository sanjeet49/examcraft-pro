"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
    userId: string;
    action: "approve" | "revoke" | "reject";
    label: string;
    className?: string;
}

export function OwnerActionButtons({ userId, action, label, className }: Props) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleClick = async () => {
        if (action === "reject" || action === "revoke") {
            if (!confirm(`Are you sure you want to ${action} this account?`)) return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/owner/users/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Action failed");
            toast.success(data.message || "Done");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const isApprove = action === "approve";
    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                isApprove
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
            } ${className || ""}`}
        >
            {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
            ) : isApprove ? (
                <CheckCircle2 className="w-3 h-3" />
            ) : (
                <XCircle className="w-3 h-3" />
            )}
            {label}
        </button>
    );
}
