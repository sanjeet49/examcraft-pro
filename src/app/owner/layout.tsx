"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Crown, Building2, LogOut, FileText } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const navLinks = [
        { href: "/owner/dashboard", label: "Dashboard", icon: Building2 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            {/* Sidebar */}
            <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col h-screen sticky top-0 backdrop-blur-sm">
                <div className="p-6 border-b border-white/10 flex items-center gap-3">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-2 shadow-lg shadow-amber-500/30">
                        <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">ExamCraft</h1>
                        <p className="text-xs text-amber-400 font-medium">Owner Portal</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Link href={href} key={href}>
                            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                pathname === href
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            }`}>
                                <Icon className="w-4 h-4" />
                                {label}
                            </div>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold uppercase text-sm overflow-hidden ring-2 ring-amber-500/30">
                            {session?.user?.image ? (
                                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <>{session?.user?.name?.[0] || "O"}</>
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{session?.user?.name || "Owner"}</p>
                            <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
            <Toaster />
        </div>
    );
}
