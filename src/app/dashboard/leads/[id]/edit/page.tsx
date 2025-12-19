import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import LeadForm from "@/components/leads/LeadForm";
import { ArrowLeft } from "lucide-react";

interface PageProps {
    params: { id: string };
}

export default async function EditLeadPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const lead = await prisma.lead.findUnique({
        where: { id: params.id },
        include: {
            source: true,
            assignedTo: { select: { id: true, name: true, email: true } },
            tags: { include: { tag: true } },
        },
    });

    if (!lead) {
        notFound();
    }

    // Staff can only edit their assigned leads
    if (session.user.role === "STAFF" && lead.assignedToId !== session.user.id) {
        redirect("/dashboard/leads");
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>
                    <p className="text-gray-500">{lead.name}</p>
                </div>
            </div>

            <LeadForm lead={lead as any} isEdit />
        </div>
    );
}
