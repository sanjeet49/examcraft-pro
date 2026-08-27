"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState<number | null>(null);
    const router = useRouter();

    const handleBuyCredits = async (amount: number, planId: number) => {
        setLoading(planId);
        try {
            // Simulate Stripe latency
            await new Promise(resolve => setTimeout(resolve, 1500));

            const res = await fetch("/api/user/credits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });

            if (!res.ok) throw new Error("Payment failed");

            const data = await res.json();

            // Force update next-auth session to reflect new credits
            await update({ credits: data.credits });

            toast.success(`Payment successful! Added ${amount} credits securely.`);
            router.refresh(); // Refresh dashboard context
        } catch (e) {
            toast.error("Mock Stripe Checkout failed.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Account Settings & Billing</h1>
                <p className="text-gray-500 mt-2">Manage your subscription, credits, and profile preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Stats */}
                <Card className="md:col-span-1 shadow-sm border-gray-200">
                    <CardHeader>
                        <CardTitle>Your Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-gray-500 text-xs uppercase tracking-wider">Email</Label>
                            <p className="font-medium">{session?.user?.email}</p>
                        </div>
                        <div>
                            <Label className="text-gray-500 text-xs uppercase tracking-wider">Plan</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${session?.user?.isPremium ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {session?.user?.isPremium ? 'PRO MEMBER' : 'FREE TIER'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <Label className="text-gray-500 text-xs uppercase tracking-wider">Current Balance</Label>
                            <p className="text-3xl font-bold text-indigo-600 flex items-center gap-2">
                                {session?.user?.credits || 0} <span className="text-sm font-medium text-gray-500">credits</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing/Topup Plans */}
                <div className="md:col-span-2 space-y-4">
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
            </div>
        </div>
    );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={`font-semibold ${className}`}>{children}</div>;
}
