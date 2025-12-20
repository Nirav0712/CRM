import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

// GET all leads (filtered by role)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.getAll("status");
        const sourceId = searchParams.getAll("sourceId");
        const assignedToId = searchParams.get("assignedToId");
        const tagIds = searchParams.getAll("tagId");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        let query: any = db.collection("leads");

        // Role-based filtering: Staff can only see their assigned leads
        if ((session.user as any).role === "STAFF") {
            query = query.where("assignedToId", "==", (session.user as any).id);
        } else if (assignedToId) {
            query = query.where("assignedToId", "==", assignedToId);
        }

        // Status filter
        if (status.length > 0) {
            query = query.where("status", "in", status);
        }

        // Source filter
        if (sourceId.length > 0) {
            query = query.where("sourceId", "in", sourceId);
        }

        // Date filter
        if (dateFrom) {
            query = query.where("createdAt", ">=", new Date(dateFrom));
        }
        if (dateTo) {
            query = query.where("createdAt", "<=", new Date(dateTo + "T23:59:59.999Z"));
        }

        // Note: Firestore doesn't support complex OR queries across different fields easily with "contains"
        // We'll fetch and filter in-memory for simpler implementation if search is present, 
        // OR we can implement multiple queries if performance is a concern.
        // For now, let's fetch based on filters and then apply search and tag filtering in memory.

        const snapshot = await query.orderBy("createdAt", "desc").get();
        let leads = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
        }));

        // Search filter (in-memory)
        if (search) {
            const searchLower = search.toLowerCase();
            leads = leads.filter((lead: any) =>
                (lead.name?.toLowerCase().includes(searchLower)) ||
                (lead.email?.toLowerCase().includes(searchLower)) ||
                (lead.phone?.toLowerCase().includes(searchLower)) ||
                (lead.companyName?.toLowerCase().includes(searchLower))
            );
        }

        // Tag filter (in-memory)
        if (tagIds.length > 0) {
            leads = leads.filter((lead: any) =>
                lead.tagIds && lead.tagIds.some((id: string) => tagIds.includes(id))
            );
        }

        // Manual joins for source, assignedTo, and tags
        const enrichedLeads = await Promise.all(leads.map(async (lead: any) => {
            // Fetch source
            let source = null;
            if (lead.sourceId) {
                const sourceDoc = await db.collection("leadSources").doc(lead.sourceId).get();
                if (sourceDoc.exists) {
                    source = { id: sourceDoc.id, ...sourceDoc.data() };
                }
            }

            // Fetch assignedTo
            let assignedTo = null;
            if (lead.assignedToId) {
                const userDoc = await db.collection("users").doc(lead.assignedToId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    assignedTo = { id: userDoc.id, name: userData?.name, email: userData?.email };
                }
            }

            // Fetch tags
            let tags: any[] = [];
            if (lead.tagIds && lead.tagIds.length > 0) {
                const tagsSnapshot = await db.collection("tags").where("__name__", "in", lead.tagIds).get();
                tags = tagsSnapshot.docs.map((doc: any) => ({
                    tag: { id: doc.id, ...doc.data() }
                }));
            }

            return {
                ...lead,
                source,
                assignedTo,
                tags
            };
        }));

        return NextResponse.json(enrichedLeads);
    } catch (error) {
        console.error("Error fetching leads:", error);
        return NextResponse.json(
            { error: "Failed to fetch leads" },
            { status: 500 }
        );
    }
}

// POST create new lead
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
            status = "PENDING",
            sourceId,
            assignedToId,
            tagIds = [],
        } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        // Use the current user as default assignee if not specified
        const finalAssignedToId = assignedToId || (session.user as any).id;

        const now = new Date();
        const leadData = {
            name,
            companyName,
            email,
            phone,
            address,
            city,
            country,
            website,
            leadValue: leadValue ? parseFloat(leadValue) : null,
            description,
            status,
            sourceId,
            assignedToId: finalAssignedToId,
            tagIds,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection("leads").add(leadData);

        // Save status history
        await db.collection("statusHistory").add({
            leadId: docRef.id,
            oldStatus: "",
            newStatus: status,
            changedBy: session.user.name,
            changedAt: now,
        });

        // Fetch the created lead for return
        const createdLead = {
            id: docRef.id,
            ...leadData
        };

        return NextResponse.json(createdLead, { status: 201 });
    } catch (error) {
        console.error("Error creating lead:", error);
        return NextResponse.json(
            { error: "Failed to create lead" },
            { status: 500 }
        );
    }
}
