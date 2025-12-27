import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";
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

    const leadDoc = await db.collection("leads").doc(params.id).get();

    if (!leadDoc.exists) {
        notFound();
    }

    const leadData = leadDoc.data()!;

    // Staff can only edit their assigned leads
    if ((session.user as any).role === "STAFF" && leadData.assignedToId !== (session.user as any).id) {
        redirect("/dashboard/leads");
    }

    // Fetch related data for form
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

    // Serialize the lead data to JSON-safe format (converts Timestamps to strings)
    const serializedLead = JSON.parse(JSON.stringify({
        id: leadDoc.id,
        ...leadData,
        createdAt: leadData.createdAt?.toDate() || null,
        updatedAt: leadData.updatedAt?.toDate() || null,
        source,
        assignedTo,
        tags
    }));

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
                    <p className="text-gray-500">{(serializedLead as any).name}</p>
                </div>
            </div>

            <LeadForm lead={serializedLead as any} isEdit />
        </div>
    );
}
