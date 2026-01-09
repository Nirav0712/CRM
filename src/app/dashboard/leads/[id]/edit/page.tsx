import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import LeadForm from "@/components/leads/LeadForm";

export const dynamic = 'force-dynamic';

import { ArrowLeft } from "lucide-react";

interface PageProps {
    params: { id: string };
}

export default async function EditLeadPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const [leadRows]: any = await db.execute(`
        SELECT l.*, s.name as sourceName, u.name as assignedToName, u.email as assignedToEmail
        FROM leads l
        LEFT JOIN lead_sources s ON l.sourceId = s.id
        LEFT JOIN users u ON l.assignedToId = u.id
        WHERE l.id = ?
    `, [params.id]);

    if (leadRows.length === 0) {
        notFound();
    }

    const leadData = leadRows[0];

    // Staff can only edit their assigned leads
    if ((session.user as any).role === "STAFF" && leadData.assignedToId !== (session.user as any).id) {
        redirect("/dashboard/leads");
    }

    // Fetch tags
    const [tagRows]: any = await db.execute(`
        SELECT t.* FROM tags t
        JOIN lead_tags lt ON t.id = lt.tagId
        WHERE lt.leadId = ?
    `, [params.id]);

    const serializedLead = {
        ...leadData,
        source: leadData.sourceId ? { id: leadData.sourceId, name: leadData.sourceName } : null,
        assignedTo: leadData.assignedToId ? { id: leadData.assignedToId, name: leadData.assignedToName, email: leadData.assignedToEmail } : null,
        tags: tagRows.map((t: any) => ({ tagId: t.id, tag: t })),
        createdAt: leadData.createdAt ? new Date(leadData.createdAt).toISOString() : null,
        updatedAt: leadData.updatedAt ? new Date(leadData.updatedAt).toISOString() : null
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/dashboard/leads/${serializedLead.id}`}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>
                    <p className="text-gray-500">{serializedLead.name}</p>
                </div>
            </div>

            <LeadForm lead={serializedLead as any} isEdit />
        </div>
    );
}
