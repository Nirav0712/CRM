import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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
    const userId = (session?.user as any)?.id;
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    // Build query based on role
    let leadsQuery: any = db.collection("leads");
    if (!isAdmin) {
        leadsQuery = leadsQuery.where("assignedToId", "==", userId);
    }

    // Get stats
    const [totalLeadsSnap, customersSnap, pendingLeadsSnap, allLeadsSnap, recentLeadsSnap] = await Promise.all([
        leadsQuery.count().get(),
        leadsQuery.where("status", "==", "CUSTOMER").count().get(),
        leadsQuery.where("status", "==", "PENDING").count().get(),
        leadsQuery.get(), // For total value sum (Firestore doesn't have aggregate sum yet)
        leadsQuery.orderBy("createdAt", "desc").limit(5).get(),
    ]);

    const totalLeads = totalLeadsSnap.data().count;
    const customers = customersSnap.data().count;
    const pendingLeads = pendingLeadsSnap.data().count;

    // Calculate total value
    let totalValueSum = 0;
    allLeadsSnap.docs.forEach((doc: any) => {
        const val = doc.data().leadValue;
        if (val) totalValueSum += parseFloat(val);
    });

    const recentLeads = await Promise.all(recentLeadsSnap.docs.map(async (doc: any) => {
        const data = doc.data();
        let source = null;
        if (data.sourceId) {
            const sourceDoc = await db.collection("leadSources").doc(data.sourceId).get();
            if (sourceDoc.exists) source = { id: sourceDoc.id, ...sourceDoc.data() };
        }
        let assignedTo = null;
        if (data.assignedToId) {
            const userDoc = await db.collection("users").doc(data.assignedToId).get();
            if (userDoc.exists) assignedTo = { name: userDoc.data()?.name };
        }
        return {
            id: doc.id,
            ...data,
            source,
            assignedTo
        };
    }));

    const stats = [
        {
            name: "Total Leads",
            value: totalLeads,
            icon: Users,
            color: "bg-blue-500",
            href: "/dashboard/leads",
        },
        {
            name: "Customers",
            value: customers,
            icon: UserCheck,
            color: "bg-green-500",
            href: "/dashboard/leads?status=CUSTOMER",
        },
        {
            name: "Pending",
            value: pendingLeads,
            icon: Clock,
            color: "bg-yellow-500",
            href: "/dashboard/leads?status=PENDING",
        },
        {
            name: "Total Value",
            value: formatCurrency(totalValueSum),
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
                    {recentLeads.length > 0 ? (
                        recentLeads.map((lead: any) => (
                            <Link
                                key={lead.id}
                                href={`/dashboard/leads/${lead.id}`}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                        <span className="text-white font-medium text-sm">
                                            {lead.name.charAt(0).toUpperCase()}
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
