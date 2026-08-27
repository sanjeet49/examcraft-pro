import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import StudentTestView from "@/components/test/StudentTestView";

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const paper = await prisma.paper.findUnique({
        where: { id: resolvedParams.id },
        include: {
            questions: {
                orderBy: { sequenceOrder: 'asc' }
            }
        }
    });

    if (!paper) {
        notFound();
    }

    if (!paper.isPublishedOnline) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col font-sans p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🚫</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Test Not Available</h1>
                    <p className="text-gray-600">This test is currently offline or has not been published yet. Please contact your instructor.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <StudentTestView paper={paper} />
        </div>
    );
}
