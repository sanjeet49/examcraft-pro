"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Eye, Edit, Trash2, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

interface PaperCardProps {
    paper: {
        id: string;
        schoolName: string;
        subject: string;
        examName: string;
        totalMarks: number;
        createdAt: Date;
        status?: string;
    };
    userRole?: string;
}

export function PaperCard({ paper, userRole = "TEACHER" }: PaperCardProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this paper? This action cannot be undone.")) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/paper/${paper.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete paper");
            toast.success("Paper deleted successfully");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Failed to delete paper");
            setIsDeleting(false);
        }
    };

    const statusColors: Record<string, string> = {
        "DRAFT": "bg-gray-100 text-gray-700",
        "PENDING_ADMIN": "bg-yellow-100 text-yellow-800",
        "PENDING_SUPERADMIN": "bg-orange-100 text-orange-800",
        "APPROVED": "bg-green-100 text-green-800",
        "REJECTED": "bg-red-100 text-red-800"
    };

    const paperStatus = paper.status || "DRAFT";
    const badgeColor = statusColors[paperStatus] || statusColors["DRAFT"];

    // Hide edit/delete for non-admins if it's already submitted
    const isLocked = userRole === "TEACHER" && paperStatus !== "DRAFT" && paperStatus !== "REJECTED";

    return (
        <Card className="hover:shadow-md transition-shadow flex flex-col">
            <CardHeader className="pb-3 flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center">
                        <div className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md uppercase line-clamp-1 max-w-[70%]">
                            {paper.subject || "General"}
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-md uppercase whitespace-nowrap ${badgeColor}`}>
                            {paperStatus.replace("_", " ")}
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {dayjs(paper.createdAt).format("MMM D, YYYY")}
                    </div>
                </div>
                <CardTitle className="text-lg line-clamp-1" title={paper.examName}>{paper.examName || "Untitled Exam"}</CardTitle>
                <CardDescription className="line-clamp-1">{paper.schoolName} • {paper.totalMarks} Marks</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
                <div className="flex gap-2">
                    <Link href={`/dashboard/builder?id=${paper.id}`} className="flex-1">
                        <Button variant={isLocked ? "secondary" : "outline"} size="sm" className={`w-full ${isLocked ? "text-gray-600" : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"}`}>
                            {isLocked ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                            {isLocked ? "View" : "Edit"}
                        </Button>
                    </Link>
                    {!isLocked && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 px-3"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function EmptyPaperCard() {
    return (
        <Link href="/dashboard/builder">
            <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-colors h-full min-h-[180px]">
                <FileText className="w-8 h-8 mb-2" />
                <p className="font-medium">Create New Paper</p>
            </div>
        </Link>
    );
}
