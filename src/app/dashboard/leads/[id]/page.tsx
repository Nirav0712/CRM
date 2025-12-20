import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";
import { notFound, redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { formatCurrency, formatDate, formatDateTime, LEAD_STATUSES, LeadStatus } from "@/lib/utils";
import StatusBadge from "@/components/leads/StatusBadge";
import {
    ArrowLeft,
    Edit,
    Mail,
    Phone,
    Globe,
    Building,
    MapPin,
    IndianRupee,
    Calendar,
    User,
    Clock,
    Tag,
} from "lucide-react";

interface PageProps {
    params: { id: string };
}

export default async function LeadDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const leadDoc = await db.collection("leads").doc(params.id).get();

    if (!leadDoc.exists) {
        notFound();
    }

    const leadData = leadDoc.data()!;

    // Staff can only view their assigned leads
    if ((session.user as any).role === "STAFF" && leadData.assignedToId !== (session.user as any).id) {
        redirect("/dashboard/leads");
    }

    // Fetch related data
    let source = null;
    if (leadData.sourceId) {
        const sourceDoc = await db.collection("leadSources").doc(leadData.sourceId).get();
        if (sourceDoc.exists) source = { id: sourceDoc.id, ...sourceDoc.data() };
    }

    let assignedTo = null;
    if (leadData.assignedToId) {
        const userDoc = await db.collection("users").doc(leadData.assignedToId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            assignedTo = { id: userDoc.id, name: userData?.name, email: userData?.email };
        }
    }

    const tagsSnapshot = await db.collection("tagOnLead")
        .where("leadId", "==", params.id)
        .get();

    const tags = await Promise.all(tagsSnapshot.docs.map(async (doc: any) => {
        const tol = doc.data();
        const tagDoc = await db.collection("tags").doc(tol.tagId).get();
        return {
            tagId: tol.tagId,
            tag: tagDoc.exists ? { id: tagDoc.id, ...tagDoc.data() } : null
        };
    }));

    const statusHistorySnapshot = await db.collection("statusHistory")
        .where("leadId", "==", params.id)
        .orderBy("changedAt", "desc")
        .get();

    const statusHistory = statusHistorySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        changedAt: doc.data().changedAt?.toDate()
    }));

    const lead = {
        id: leadDoc.id,
        ...leadData,
        createdAt: leadData.createdAt?.toDate(),
        updatedAt: leadData.updatedAt?.toDate(),
        source,
        assignedTo,
        tags,
        statusHistory
    } as any;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/leads"
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                        {lead.companyName && (
                            <p className="text-gray-500">{lead.companyName}</p>
                        )}
                    </div>
                </div>
                <Link href={`/dashboard/leads/${lead.id}/edit`} className="btn-primary">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Lead
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Info */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Contact Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {lead.email && (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gray-100">
                                        <Mail className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Email</p>
                                        <a
                                            href={`mailto:${lead.email}`}
                                            className="text-primary-600 hover:underline"
                                        >
                                            {lead.email}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {lead.phone && (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gray-100">
                                        <Phone className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Phone</p>
                                        <a
                                            href={`tel:${lead.phone}`}
                                            className="text-primary-600 hover:underline"
                                        >
                                            {lead.phone}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {lead.website && (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gray-100">
                                        <Globe className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Website</p>
                                        <a
                                            href={lead.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-600 hover:underline"
                                        >
                                            {lead.website}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {lead.companyName && (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gray-100">
                                        <Building className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Company</p>
                                        <p className="text-gray-900">{lead.companyName}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    {(lead.address || lead.city || lead.country) && (
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Address
                            </h3>
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-gray-100">
                                    <MapPin className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    {lead.address && <p className="text-gray-900">{lead.address}</p>}
                                    <p className="text-gray-600">
                                        {[lead.city, lead.country].filter(Boolean).join(", ")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {lead.description && (
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{lead.description}</p>
                        </div>
                    )}

                    {/* Status History */}
                    {lead.statusHistory && lead.statusHistory.length > 0 && (
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Status History
                            </h3>
                            <div className="space-y-4">
                                {lead.statusHistory.map((history: any, index: number) => (
                                    <div key={history.id} className="flex items-start gap-4">
                                        <div className="relative">
                                            <div className="w-3 h-3 rounded-full bg-primary-500 ring-4 ring-primary-100" />
                                            {index !== lead.statusHistory.length - 1 && (
                                                <div className="absolute top-3 left-1.5 w-0.5 h-full -translate-x-1/2 bg-gray-200" />
                                            )}
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {history.oldStatus && (
                                                    <>
                                                        <StatusBadge status={history.oldStatus} size="sm" />
                                                        <span className="text-gray-400">→</span>
                                                    </>
                                                )}
                                                <StatusBadge status={history.newStatus} size="sm" />
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                by {history.changedBy} • {formatDateTime(history.changedAt)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status & Value */}
                    <div className="card p-6 space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Status</p>
                            <StatusBadge status={lead.status} />
                        </div>
                        {lead.leadValue && (
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Value</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(lead.leadValue)}
                                </p>
                            </div>
                        )}
                        {lead.source && (
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Source</p>
                                <p className="text-gray-900">{lead.source.name}</p>
                            </div>
                        )}
                    </div>

                    {/* Assignment */}
                    <div className="card p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                    {lead.assignedTo?.name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Assigned to</p>
                                <p className="font-medium text-gray-900">{lead.assignedTo?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                        <div className="card p-6">
                            <p className="text-sm text-gray-500 mb-3">Tags</p>
                            <div className="flex flex-wrap gap-2">
                                {lead.tags.map((t: any) => (
                                    <span
                                        key={t.tagId}
                                        className="badge"
                                        style={{
                                            backgroundColor: `${t.tag?.color}20`,
                                            color: t.tag?.color,
                                        }}
                                    >
                                        {t.tag?.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="card p-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-500">Created:</span>
                            <span className="text-gray-900">{formatDate(lead.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-500">Updated:</span>
                            <span className="text-gray-900">{formatDate(lead.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
