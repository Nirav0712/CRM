import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

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

        const [leadRows]: any = await db.execute(`
            SELECT l.*, 
                   s.name as sourceName,
                   u.name as assignedToName, u.email as assignedToEmail
            FROM leads l
            LEFT JOIN lead_sources s ON l.sourceId = s.id
            LEFT JOIN users u ON l.assignedToId = u.id
            WHERE l.id = ?
        `, [params.id]);

        if (!leadRows || leadRows.length === 0) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        const lead = leadRows[0];

        // Staff can only view their assigned leads
        if ((session.user as any).role === "STAFF" && lead.assignedToId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch source and assignedTo enriched objects (mapped from query results)
        const enrichedLead = {
            ...lead,
            source: lead.sourceId ? { id: lead.sourceId, name: lead.sourceName } : null,
            assignedTo: lead.assignedToId ? { id: lead.assignedToId, name: lead.assignedToName, email: lead.assignedToEmail } : null,
        };

        // Fetch tags
        const [tagRows]: any = await db.execute(`
            SELECT t.* 
            FROM tags t
            JOIN lead_tags lt ON t.id = lt.tagId
            WHERE lt.leadId = ?
        `, [params.id]);
        enrichedLead.tags = tagRows.map((t: any) => ({ tag: t }));

        // Fetch status history
        const [historyRows]: any = await db.execute(`
            SELECT * FROM status_history
            WHERE leadId = ?
            ORDER BY changedAt DESC
        `, [params.id]);
        enrichedLead.statusHistory = historyRows;

        return NextResponse.json(enrichedLead);
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

        const [existingRows]: any = await db.execute("SELECT * FROM leads WHERE id = ?", [params.id]);

        if (!existingRows || existingRows.length === 0) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        const existingLead = existingRows[0];

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
            (session.user as any).role === "ADMIN" && assignedToId !== undefined
                ? (assignedToId.trim() === "" ? null : assignedToId)
                : existingLead.assignedToId;

        const finalSourceId = (sourceId !== undefined && sourceId.trim() === "") ? null : sourceId;

        // Track status change
        const statusChanged = status !== undefined && status !== existingLead.status;

        const now = new Date();
        const fieldsToUpdate: string[] = ["updatedAt = ?"];
        const updateParams: any[] = [now];

        if (name !== undefined) { fieldsToUpdate.push("name = ?"); updateParams.push(name); }
        if (companyName !== undefined) { fieldsToUpdate.push("companyName = ?"); updateParams.push(companyName); }
        if (email !== undefined) { fieldsToUpdate.push("email = ?"); updateParams.push(email); }
        if (phone !== undefined) { fieldsToUpdate.push("phone = ?"); updateParams.push(phone); }
        if (address !== undefined) { fieldsToUpdate.push("address = ?"); updateParams.push(address); }
        if (city !== undefined) { fieldsToUpdate.push("city = ?"); updateParams.push(city); }
        if (country !== undefined) { fieldsToUpdate.push("country = ?"); updateParams.push(country); }
        if (website !== undefined) { fieldsToUpdate.push("website = ?"); updateParams.push(website); }
        if (leadValue !== undefined) { fieldsToUpdate.push("leadValue = ?"); updateParams.push(leadValue ? parseFloat(leadValue) : null); }
        if (description !== undefined) { fieldsToUpdate.push("description = ?"); updateParams.push(description); }
        if (status !== undefined) { fieldsToUpdate.push("status = ?"); updateParams.push(status); }
        if (finalSourceId !== undefined) { fieldsToUpdate.push("sourceId = ?"); updateParams.push(finalSourceId); }
        if (finalAssignedToId !== undefined) { fieldsToUpdate.push("assignedToId = ?"); updateParams.push(finalAssignedToId); }

        updateParams.push(params.id);
        await db.execute(`UPDATE leads SET ${fieldsToUpdate.join(", ")} WHERE id = ?`, updateParams);

        if (statusChanged) {
            await db.execute(`
                INSERT INTO status_history (leadId, oldStatus, newStatus, changedBy, changedAt)
                VALUES (?, ?, ?, ?, ?)
            `, [params.id, existingLead.status, status, session.user.name, now]);
        }

        // Update tags if provided
        if (tagIds !== undefined) {
            // Delete old tags
            await db.execute("DELETE FROM lead_tags WHERE leadId = ?", [params.id]);
            // Insert new tags
            if (tagIds.length > 0) {
                for (const tagId of tagIds) {
                    await db.execute("INSERT INTO lead_tags (leadId, tagId) VALUES (?, ?)", [params.id, tagId]);
                }
            }
        }

        return NextResponse.json({ id: params.id, ...body, updatedAt: now });
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

        // Schema should have CASCADE delete, but let's be explicit if needed.
        // For MySQL, if relations are set up correctly, this will handle tags and status history.
        await db.execute("DELETE FROM leads WHERE id = ?", [params.id]);

        return NextResponse.json({ message: "Lead deleted successfully" });
    } catch (error) {
        console.error("Error deleting lead:", error);
        return NextResponse.json(
            { error: "Failed to delete lead" },
            { status: 500 }
        );
    }
}
