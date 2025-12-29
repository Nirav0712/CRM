"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Tag,
    Layers,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Calendar,
    ClipboardList,
    Clock,
    Settings,
    Building2,
    MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", href: "/dashboard/leads", icon: Users },
    { name: "Add Lead", href: "/dashboard/leads/new", icon: UserPlus },
    { name: "Clients", href: "/dashboard/clients", icon: Building2 },
    { name: "Chat", href: "/dashboard/chat", icon: MessageCircle },
    { name: "Attendance", href: "/dashboard/attendance", icon: Calendar },
    { name: "Tasks", href: "/dashboard/tasks", icon: ClipboardList },
    { name: "Sources", href: "/dashboard/sources", icon: Layers },
    { name: "Tags", href: "/dashboard/tags", icon: Tag },
];

const adminNavigation = [
    { name: "Staff", href: "/dashboard/staff", icon: Users },
    { name: "Approvals", href: "/dashboard/approvals", icon: Clock },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isAdmin = session?.user?.role === "ADMIN";

    const NavLinks = () => (
        <>
            {navigation.map((item) => {
                const isActive = pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            isActive ? "sidebar-link-active" : "sidebar-link"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                    </Link>
                );
            })}

            {isAdmin && (
                <>
                    <div className="pt-4 mt-4 border-t border-gray-200">
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Admin
                        </p>
                    </div>
                    {adminNavigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    isActive ? "sidebar-link-active" : "sidebar-link"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </>
            )}
        </>
    );

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md lg:hidden"
            >
                {mobileOpen ? (
                    <X className="w-6 h-6 text-gray-600" />
                ) : (
                    <Menu className="w-6 h-6 text-gray-600" />
                )}
            </button>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:transform-none",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center h-16 px-6 border-b border-gray-200 hover:opacity-90 transition-opacity">
                        <img
                            src="/logo.png"
                            alt="Phoenix CRM"
                            className="h-10 w-auto object-contain"
                        />
                    </Link>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        <NavLinks />
                    </nav>

                    {/* User menu */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {session?.user?.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {session?.user?.role}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
