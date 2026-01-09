import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

import {
    Users,
    TrendingUp,
    IndianRupee,
    Clock,
    ArrowUpRight,
    UserCheck,
} from "lucide-react";
import StatusBadge from "@/components/leads/StatusBadge";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === "ADMIN";

    // Build stats query
    const whereClause = isAdmin ? "" : "WHERE assignedToId = ?";
    const params = isAdmin ? [] : [userId || null];

    // Get counts
    const [[{ totalLeads }]]: any = await db.execute(`SELECT COUNT(*) as totalLeads FROM leads ${whereClause}`, params);
    const [[{ customers }]]: any = await db.execute(`SELECT COUNT(*) as customers FROM leads ${isAdmin ? "WHERE" : "WHERE assignedToId = ? AND"} status = 'CUSTOMER'`, params);
    const [[{ pendingLeads }]]: any = await db.execute(`SELECT COUNT(*) as pendingLeads FROM leads ${isAdmin ? "WHERE" : "WHERE assignedToId = ? AND"} status = 'PENDING'`, params);

    // Total value
    const [[{ totalValueSum }]]: any = await db.execute(`SELECT SUM(CAST(leadValue AS DECIMAL(10,2))) as totalValueSum FROM leads ${whereClause}`, params);

    // Recent leads
    const [recentLeadsRows]: any = await db.execute(`
        SELECT l.*, s.name as sourceName, u.name as assignedToName
        FROM leads l
        LEFT JOIN lead_sources s ON l.sourceId = s.id
        LEFT JOIN users u ON l.assignedToId = u.id
        ${whereClause}
        ORDER BY l.createdAt DESC
        LIMIT 5
    `, params);

    const stats = [
        {
            name: "Total Leads",
            value: totalLeads || 0,
            icon: Users,
            color: "bg-blue-500",
            href: "/dashboard/leads",
        },
        {
            name: "Customers",
            value: customers || 0,
            icon: UserCheck,
            color: "bg-green-500",
            href: "/dashboard/leads?status=CUSTOMER",
        },
        {
            name: "Pending",
            value: pendingLeads || 0,
            icon: Clock,
            color: "bg-yellow-500",
            href: "/dashboard/leads?status=PENDING",
        },
        {
            name: "Total Value",
            value: formatCurrency(totalValueSum || 0),
            icon: IndianRupee,
            color: "bg-purple-500",
            href: "/dashboard/leads",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">
                    Welcome back, {session?.user?.name}
                    {!isAdmin && " — Viewing your assigned leads"}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Link key={stat.name} href={stat.href} className="card-hover p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{stat.name}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {stat.value}
                                </p>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.color}`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Recent Leads */}
            <div className="card">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Recent Leads</h2>
                    <Link
                        href="/dashboard/leads"
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                        View all
                        <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="divide-y divide-gray-100">
                    {recentLeadsRows.length > 0 ? (
                        recentLeadsRows.map((lead: any) => (
                            <Link
                                key={lead.id}
                                href={`/dashboard/leads/${lead.id}`}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                        <span className="text-white font-medium text-sm">
                                            {lead.name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{lead.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {lead.companyName || lead.email || "No details"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {lead.leadValue && (
                                        <span className="text-sm font-medium text-gray-900 hidden sm:block">
                                            {formatCurrency(lead.leadValue)}
                                        </span>
                                    )}
                                    <StatusBadge status={lead.status} size="sm" />
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No leads yet.{" "}
                            <Link
                                href="/dashboard/leads/new"
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Create your first lead
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                    href="/dashboard/leads/new"
                    className="card-hover p-5 flex items-center gap-4"
                >
                    <div className="p-3 rounded-xl bg-primary-100">
                        <Users className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Add New Lead</p>
                        <p className="text-sm text-gray-500">Create a new lead entry</p>
                    </div>
                </Link>

                <Link
                    href="/dashboard/sources"
                    className="card-hover p-5 flex items-center gap-4"
                >
                    <div className="p-3 rounded-xl bg-green-100">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Manage Sources</p>
                        <p className="text-sm text-gray-500">Add or view lead sources</p>
                    </div>
                </Link>

                <Link
                    href="/dashboard/tags"
                    className="card-hover p-5 flex items-center gap-4"
                >
                    <div className="p-3 rounded-xl bg-purple-100">
                        <Clock className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Manage Tags</p>
                        <p className="text-sm text-gray-500">Organize with custom tags</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
