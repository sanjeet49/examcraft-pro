"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveUserButton({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleApprove = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Failed to approve user.");
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleApprove}
            disabled={loading}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400"
        >
            {loading ? "Approving..." : "Approve"}
        </button>
    );
}
