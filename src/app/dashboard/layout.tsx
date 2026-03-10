"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, LayoutDashboard, PlusCircle, Settings, Coins, Menu, X } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/builder", label: "New Paper", icon: PlusCircle },
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ];

    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

    return (
        <div className="min-h-screen bg-gray-50 flex print:block print:bg-white">
            {/* ===== DESKTOP SIDEBAR (hidden on mobile) ===== */}
            <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col h-screen sticky top-0 print:hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="bg-indigo-600 rounded-md p-2">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">ExamCraft</h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Link href={href} key={href}>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start ${isActive(href) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            >
                                <Icon className="mr-3 h-5 w-5" />
                                {label}
                            </Button>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="mb-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <Coins className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Credits</p>
                            <p className="text-sm font-bold text-gray-900">{session?.user?.credits || 0} left</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                            {session?.user?.name?.[0] || session?.user?.email?.[0] || "U"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name || "Teacher"}</p>
                            <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => signOut({ callbackUrl: '/' })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* ===== MOBILE TOP BAR (visible only on mobile/tablet) ===== */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 print:hidden">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 rounded-md p-1.5">
                        <FileText className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-900">ExamCraft</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700">{session?.user?.credits || 0}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                </div>
            </div>

            {/* ===== MOBILE SLIDE-DOWN MENU ===== */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg print:hidden">
                    <nav className="p-4 space-y-1">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <Link href={href} key={href} onClick={() => setMobileMenuOpen(false)}>
                                <Button
                                    variant="ghost"
                                    className={`w-full justify-start ${isActive(href) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600'}`}
                                >
                                    <Icon className="mr-3 h-5 w-5" />
                                    {label}
                                </Button>
                            </Link>
                        ))}
                    </nav>
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase text-sm">
                                {session?.user?.name?.[0] || "U"}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{session?.user?.name || "Teacher"}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[160px]">{session?.user?.email}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => signOut({ callbackUrl: '/' })}>
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ===== MOBILE BOTTOM NAV ===== */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around py-2 px-4 print:hidden">
                {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link href={href} key={href} className="flex-1">
                        <div className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${isActive(href) ? 'text-indigo-600' : 'text-gray-500'}`}>
                            <Icon className={`w-5 h-5 ${isActive(href) ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className={`text-[10px] font-medium ${isActive(href) ? 'text-indigo-600' : 'text-gray-500'}`}>{label}</span>
                        </div>
                    </Link>
                ))}
                <button
                    className="flex-1 flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-gray-500"
                    onClick={() => signOut({ callbackUrl: '/' })}
                >
                    <LogOut className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] font-medium">Sign Out</span>
                </button>
            </nav>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 overflow-auto lg:overflow-auto pt-14 lg:pt-0 pb-16 lg:pb-0 print:p-0 print:m-0 print:overflow-visible">
                {children}
            </main>
            <Toaster />
        </div>
    );
}
