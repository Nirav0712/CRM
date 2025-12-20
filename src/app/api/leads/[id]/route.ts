export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

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

        const leadDoc = await db.collection("leads").doc(params.id).get();

        if (!leadDoc.exists) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        const leadData = leadDoc.data();
        const lead: any = {
            id: leadDoc.id,
            ...leadData,
            createdAt: (leadData as any)?.createdAt?.toDate(),
            updatedAt: (leadData as any)?.updatedAt?.toDate(),
        };

        // Staff can only view their assigned leads
        if ((session.user as any).role === "STAFF" && lead.assignedToId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Manual joins
        // Fetch source
        if (lead.sourceId) {
            const sourceDoc = await db.collection("leadSources").doc(lead.sourceId).get();
            if (sourceDoc.exists) {
                (lead as any).source = { id: sourceDoc.id, ...sourceDoc.data() };
            }
        }

        // Fetch assignedTo
        if (lead.assignedToId) {
            const userDoc = await db.collection("users").doc(lead.assignedToId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                (lead as any).assignedTo = { id: userDoc.id, name: userData?.name, email: userData?.email };
            }
        }

        // Fetch tags
        if (lead.tagIds && lead.tagIds.length > 0) {
            const tagsSnapshot = await db.collection("tags").where("__name__", "in", lead.tagIds).get();
            (lead as any).tags = tagsSnapshot.docs.map((doc: any) => ({
                tag: { id: doc.id, ...doc.data() }
            }));
        }

        // Fetch status history
        const statusHistorySnapshot = await db.collection("statusHistory")
            .where("leadId", "==", params.id)
            .orderBy("changedAt", "desc")
            .get();
        (lead as any).statusHistory = statusHistorySnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            changedAt: doc.data().changedAt?.toDate()
        }));

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

        const leadRef = db.collection("leads").doc(params.id);
        const leadDoc = await leadRef.get();

        if (!leadDoc.exists) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        const existingLead = leadDoc.data()!;

        // Staff can only edit their assigned leads
        if ((session.user as any).role === "STAFF" && existingLead.assignedToId !== (session.user as any).id) {
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
            (session.user as any).role === "ADMIN" && assignedToId
                ? assignedToId
                : existingLead.assignedToId;

        // Track status change
        const statusChanged = status && status !== existingLead.status;

        const now = new Date();
        const updateData: any = {
            updatedAt: now,
        };

        if (name !== undefined) updateData.name = name;
        if (companyName !== undefined) updateData.companyName = companyName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (country !== undefined) updateData.country = country;
        if (website !== undefined) updateData.website = website;
        if (leadValue !== undefined) updateData.leadValue = leadValue ? parseFloat(leadValue) : null;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (sourceId !== undefined) updateData.sourceId = sourceId;
        if (finalAssignedToId !== undefined) updateData.assignedToId = finalAssignedToId;
        if (tagIds !== undefined) updateData.tagIds = tagIds;

        await leadRef.update(updateData);

        if (statusChanged) {
            await db.collection("statusHistory").add({
                leadId: params.id,
                oldStatus: existingLead.status,
                newStatus: status,
                changedBy: session.user.name,
                changedAt: now,
            });
        }

        return NextResponse.json({ id: params.id, ...updateData });
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

        if ((session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // We should also delete status history, though it's not strictly required by Prisma's original code 
        // (but Prisma lead model had onDelete: Cascade in theory, though the delete call didn't show it explicitly)
        // Let's just delete the lead for now to match behavior.

        await db.collection("leads").doc(params.id).delete();

        return NextResponse.json({ message: "Lead deleted successfully" });
    } catch (error) {
        console.error("Error deleting lead:", error);
        return NextResponse.json(
            { error: "Failed to delete lead" },
            { status: 500 }
        );
    }
}
