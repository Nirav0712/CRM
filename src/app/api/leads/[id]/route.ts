import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET single lead
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: params.id },
            include: {
                source: true,
                assignedTo: {
                    select: { id: true, name: true, email: true },
                },
                tags: {
                    include: { tag: true },
                },
                statusHistory: {
                    orderBy: { changedAt: "desc" },
                },
            },
        });

        if (!lead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        // Staff can only view their assigned leads
        if (session.user.role === "STAFF" && lead.assignedToId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(lead);
    } catch (error) {
        console.error("Error fetching lead:", error);
        return NextResponse.json(
            { error: "Failed to fetch lead" },
            { status: 500 }
        );
    }
}

// PUT update lead
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const existingLead = await prisma.lead.findUnique({
            where: { id: params.id },
        });

        if (!existingLead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        // Staff can only edit their assigned leads
        if (session.user.role === "STAFF" && existingLead.assignedToId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            companyName,
            email,
            phone,
            address,
            city,
            country,
            website,
            leadValue,
            description,
            status,
            sourceId,
            assignedToId,
            tagIds,
        } = body;

        // Only admin can reassign leads
        const finalAssignedToId =
            session.user.role === "ADMIN" && assignedToId
                ? assignedToId
                : existingLead.assignedToId;

        // Track status change
        const statusChanged = status && status !== existingLead.status;

        // Update tags if provided
        if (tagIds !== undefined) {
            // Remove existing tags
            await prisma.tagOnLead.deleteMany({
                where: { leadId: params.id },
            });
        }

        const lead = await prisma.lead.update({
            where: { id: params.id },
            data: {
                name,
                companyName,
                email,
                phone,
                address,
                city,
                country,
                website,
                leadValue: leadValue !== undefined ? (leadValue ? parseFloat(leadValue) : null) : undefined,
                description,
                status,
                sourceId,
                assignedToId: finalAssignedToId,
                tags: tagIds !== undefined ? {
                    create: tagIds.map((tagId: string) => ({
                        tagId,
                    })),
                } : undefined,
                statusHistory: statusChanged ? {
                    create: {
                        oldStatus: existingLead.status,
                        newStatus: status,
                        changedBy: session.user.name,
                    },
                } : undefined,
            },
            include: {
                source: true,
                assignedTo: {
                    select: { id: true, name: true, email: true },
                },
                tags: {
                    include: { tag: true },
                },
                statusHistory: {
                    orderBy: { changedAt: "desc" },
                },
            },
        });

        return NextResponse.json(lead);
    } catch (error) {
        console.error("Error updating lead:", error);
        return NextResponse.json(
            { error: "Failed to update lead" },
            { status: 500 }
        );
    }
}

// DELETE lead (admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.lead.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Lead deleted successfully" });
    } catch (error) {
        console.error("Error deleting lead:", error);
        return NextResponse.json(
            { error: "Failed to delete lead" },
            { status: 500 }
        );
    }
}
