"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Crown, Building2, ShieldCheck, Users, Activity, CheckCircle2, XCircle, AlertCircle, ExternalLink, Search, FileText, Blocks, Coins, Power, PowerOff, Loader2, User } from "lucide-react";
import { OwnerActionButtons } from "@/components/owner/OwnerActionButtons";
import { OwnerProfileTab } from "./OwnerProfileTab";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface OwnerDashboardClientProps {
    schools: any[];
    pendingSuperAdmins: any[];
    stats: Record<string, number>;
    totals: { coins: number; papers: number; usedCoins: number };
}

export function OwnerDashboardClient({ schools, pendingSuperAdmins, stats, totals }: OwnerDashboardClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [globalUserQuery, setGlobalUserQuery] = useState("");
    const [activatingSchoolId, setActivatingSchoolId] = useState<string | null>(null);
    
    // Global search state
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const schoolsPerPage = 5;

    const router = useRouter();

    // Close global search dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setShowSearchDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Global Search Debouncer
    useEffect(() => {
        if (!globalUserQuery.trim()) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/owner/users/search?q=${encodeURIComponent(globalUserQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.users || []);
                    setShowSearchDropdown(true);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [globalUserQuery]);

    // Filter Schools by name or SCH code
    const filteredSchools = schools.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.schoolCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Reset pagination when searching schools
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(filteredSchools.length / schoolsPerPage);
    const paginatedSchools = filteredSchools.slice(
        (currentPage - 1) * schoolsPerPage,
        currentPage * schoolsPerPage
    );

    const toggleSchoolStatus = async (schoolId: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? "SUSPEND" : "ACTIVATE"} this school? ${currentStatus ? 'All members will be locked out.' : ''}`)) return;
        
        setActivatingSchoolId(schoolId);
        try {
            const res = await fetch("/api/owner/schools/toggle-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId, isActive: !currentStatus })
            });
            if (!res.ok) throw new Error("Failed to update status");
            toast.success(`School ${currentStatus ? "suspended" : "activated"} successfully.`);
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Failed to update school status.");
        } finally {
            setActivatingSchoolId(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl shadow-xl shadow-amber-500/30">
                        <Crown className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Owner Dashboard</h1>
                        <p className="text-slate-400 mt-0.5">Platform-wide control center</p>
                    </div>
                </div>
                
                {/* Global Action / Search mock */}
                <div className="flex-1 w-full md:max-w-md relative" ref={searchWrapperRef}>
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <Input 
                            value={globalUserQuery}
                            onChange={(e) => {
                                setGlobalUserQuery(e.target.value);
                                setShowSearchDropdown(true);
                            }}
                            placeholder="Global user lookup (email, display ID, name)..." 
                            className="w-full bg-white/5 border-white/10 text-white placeholder:text-slate-500 pl-10 h-11 rounded-xl focus-visible:ring-amber-500 focus-visible:ring-offset-slate-900" 
                        />
                        {isSearching && (
                            <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
                        )}
                    </div>
                    
                    {/* Search Dropdown Overlay */}
                    {showSearchDropdown && globalUserQuery.trim() !== "" && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
                            {isSearching && searchResults.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-sm">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                <ul className="divide-y divide-white/5">
                                    {searchResults.map((u) => (
                                        <li key={u.id} className="p-3 hover:bg-white/5 transition-colors flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xs uppercase flex-shrink-0">
                                                    {u.name?.[0] || <User className="w-4 h-4" />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-white text-sm font-semibold truncate">{u.name || "Unknown User"}</p>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-slate-400 uppercase tracking-widest">{u.role}</span>
                                                    </div>
                                                    <p className="text-slate-400 text-xs truncate">{u.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {u.school ? (
                                                    <p className="text-xs text-amber-400/90 font-mono bg-amber-500/10 px-2 py-1 rounded truncate max-w-[100px] border border-amber-500/20">{u.school.schoolCode}</p>
                                                ) : (
                                                    <p className="text-[10px] text-slate-500 uppercase">No School</p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 text-center text-slate-400 text-sm">No users found.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full space-y-6">
                <div className="flex overflow-x-auto pb-2 scrollbar-hide">
                    <TabsList className="bg-white/5 border border-white/10 p-1 w-full sm:w-auto h-auto rounded-xl">
                        <TabsTrigger value="overview" className="py-2.5 px-6 rounded-lg text-sm font-medium data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 transition-all">
                            Platform Overview
                        </TabsTrigger>
                        <TabsTrigger value="directory" className="py-2.5 px-6 rounded-lg text-sm font-medium data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 transition-all">
                            Schools & Directory
                        </TabsTrigger>
                        <TabsTrigger value="approvals" className="py-2.5 px-6 rounded-lg text-sm font-medium data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 transition-all">
                            Pending {pendingSuperAdmins.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingSuperAdmins.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="identity" className="py-2.5 px-6 rounded-lg text-sm font-medium data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 transition-all">
                            Owner Identity & Security
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* TAB 1: OVERVIEW */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <div className="inline-flex p-2.5 rounded-xl bg-blue-400/10 mb-3">
                                <Building2 className="w-5 h-5 text-blue-400" />
                            </div>
                            <p className="text-3xl font-bold text-white">{schools.length}</p>
                            <p className="text-slate-400 text-sm mt-0.5">Total Schools</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <div className="inline-flex p-2.5 rounded-xl bg-purple-400/10 mb-3">
                                <ShieldCheck className="w-5 h-5 text-purple-400" />
                            </div>
                            <p className="text-3xl font-bold text-white">{stats["SUPER_ADMIN"] || 0}</p>
                            <p className="text-slate-400 text-sm mt-0.5">Super Admins</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <div className="inline-flex p-2.5 rounded-xl bg-green-400/10 mb-3">
                                <Users className="w-5 h-5 text-green-400" />
                            </div>
                            <p className="text-3xl font-bold text-white">{stats["ADMIN"] || 0}</p>
                            <p className="text-slate-400 text-sm mt-0.5">Admins</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <div className="inline-flex p-2.5 rounded-xl bg-orange-400/10 mb-3">
                                <Activity className="w-5 h-5 text-orange-400" />
                            </div>
                            <p className="text-3xl font-bold text-white">{stats["TEACHER"] || 0}</p>
                            <p className="text-slate-400 text-sm mt-0.5">Teachers</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <Coins className="w-32 h-32 text-indigo-400" />
                            </div>
                            <div className="inline-flex p-2 rounded-xl bg-indigo-500/20 mb-4">
                                <Coins className="w-5 h-5 text-indigo-300" />
                            </div>
                            <h3 className="text-indigo-200 text-sm font-medium mb-1">Global Credit Economics</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-4xl font-bold text-white">{totals.coins}</span>
                                <span className="text-indigo-300 text-sm">active balance</span>
                            </div>
                            <div className="w-full bg-indigo-950/50 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-400 h-full rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-indigo-300/60">
                                <span>Used: ~{Math.floor(totals.coins * 0.45)}</span>
                                <span>Total minted: {Math.floor(totals.coins * 1.45)}</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <FileText className="w-32 h-32 text-emerald-400" />
                            </div>
                            <div className="inline-flex p-2 rounded-xl bg-emerald-500/20 mb-4">
                                <FileText className="w-5 h-5 text-emerald-300" />
                            </div>
                            <h3 className="text-emerald-200 text-sm font-medium mb-1">Total Papers Generated</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-white">{totals.papers}</span>
                                <span className="text-emerald-300 text-sm">test papers</span>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: DIRECTORY */}
                <TabsContent value="directory" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <div className="relative w-full sm:w-96">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input 
                                placeholder="Search schools by name or SCH code..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 pl-10" 
                            />
                        </div>
                        <span className="text-sm font-medium text-slate-400 w-full sm:w-auto text-left">
                            Viewing {filteredSchools.length} of {schools.length}
                        </span>
                    </div>

                    {filteredSchools.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 bg-white/5 border border-white/10 rounded-2xl">
                            <Blocks className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No schools match your search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {paginatedSchools.map((school) => (
                                <div key={school.id} className={`p-5 border rounded-2xl transition-all ${school.isActive ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-red-950/20 border-red-500/20'}`}>
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-white">{school.name}</h3>
                                                <span className={`text-xs px-2.5 py-1 rounded-full border ${school.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium" : "bg-red-500/10 text-red-500 border-red-500/30 font-bold"}`}>
                                                    {school.isActive ? "Active" : "SUSPENDED"}
                                                </span>
                                            </div>
                                            <p className="text-slate-400 text-sm font-mono tracking-widest">{school.schoolCode}</p>
                                            {school.address && <p className="text-slate-500 text-xs mt-1">{school.address}</p>}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right text-xs text-slate-400 bg-black/20 p-2.5 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div><span className="text-white font-bold text-sm block">{school._count.users}</span> Users</div>
                                                    <div className="w-px h-6 bg-white/10"></div>
                                                    <div><span className="text-white font-bold text-sm block">{school._count.papers}</span> Papers</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => toggleSchoolStatus(school.id, school.isActive)}
                                                disabled={activatingSchoolId === school.id}
                                                className={`p-2.5 rounded-xl transition-all ${school.isActive ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'}`}
                                                title={school.isActive ? "Suspend School" : "Activate School"}
                                            >
                                                {activatingSchoolId === school.id ? <div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin rounded-full" /> : school.isActive ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {school.users.length > 0 && (
                                        <div className="border-t border-white/5 pt-4 mt-4 space-y-2">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Key Contacts (Super Admins)</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {school.users.map((sa: any) => (
                                                    <div key={sa.id} className="flex items-center gap-3 bg-black/20 rounded-xl p-2.5 border border-white/5">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs uppercase flex-shrink-0">
                                                            {sa.name?.[0] || "?"}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-white text-xs font-semibold truncate">{sa.name || sa.email}</p>
                                                            <p className="text-slate-500 text-[10px] truncate">{sa.phone || sa.email}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-slate-400">
                                        Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* TAB 3: PENDING KYC */}
                <TabsContent value="approvals" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                     {pendingSuperAdmins.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 bg-white/5 border border-white/10 rounded-2xl">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
                            <h3 className="text-lg text-white font-medium mb-1">All clear!</h3>
                            <p>No accounts are pending KYC review right now.</p>
                        </div>
                    ) : (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-amber-500/10 flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-full text-amber-500 animate-pulse">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <h2 className="text-amber-100 font-medium">Attention Required</h2>
                            </div>
                            <ul className="divide-y divide-amber-500/10">
                                {pendingSuperAdmins.map((user) => (
                                    <li key={user.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/5 transition-colors">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                                                    <span className="text-xs font-mono font-bold text-amber-400">{user.displayId || "—"}</span>
                                                </div>
                                                <p className="text-white font-medium text-lg leading-none">{user.name || "Unknown"}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                                                <span>{user.email}</span>
                                                <span className="hidden sm:inline">•</span>
                                                <span>{user.phone || "No phone"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 bg-black/20 p-2.5 rounded-lg border border-white/5 w-fit">
                                                <Building2 className="w-4 h-4 text-slate-500" />
                                                <p className="text-slate-300 text-sm">
                                                    <span className="font-semibold text-white">{user.school?.name || "Unknown"}</span>
                                                    {user.school?.schoolCode && <span className="ml-2 font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">({user.school.schoolCode})</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
                                            {user.idDocUrl ? (
                                                <a href={user.idDocUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors bg-amber-400/10 hover:bg-amber-400/20 px-4 py-2 rounded-xl group border border-amber-400/20">
                                                    <ExternalLink className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                                    View KYC: {user.idType || "ID"} ({user.idNumber || "N/A"})
                                                </a>
                                            ) : (
                                                <span className="text-sm text-rose-400 font-medium px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                                                    <XCircle className="w-4 h-4" /> No Document Uploaded
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <div className="flex-1 sm:flex-none">
                                                    <OwnerActionButtons userId={user.id} action="reject" label="Reject KYC" className="w-full" />
                                                </div>
                                                <div className="flex-1 sm:flex-none">
                                                    <OwnerActionButtons userId={user.id} action="approve" label="Approve User" className="w-full" />
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </TabsContent>

                {/* TAB 4: IDENTITY */}
                <TabsContent value="identity" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <OwnerProfileTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

