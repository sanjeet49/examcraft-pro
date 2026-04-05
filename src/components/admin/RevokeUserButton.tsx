"use client";

import { useState } from "react";
import { toast } from "sonner";
import { XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
    userId: string;
    userName: string;
}

export function RevokeUserButton({ userId, userName }: Props) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRevoke = async () => {
        if (!confirm(`Are you sure you want to revoke access for ${userName}? Their account will be deactivated.`)) return;
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users/revoke", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Revoke failed");
            toast.success(data.message || "User revoked");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleRevoke}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
            Revoke
        </button>
    );
}
