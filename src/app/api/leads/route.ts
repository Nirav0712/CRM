import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

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

        let sql = `
            SELECT l.*, 
                   s.name as sourceName,
                   u.name as assignedToName, u.email as assignedToEmail
            FROM leads l
            LEFT JOIN lead_sources s ON l.sourceId = s.id
            LEFT JOIN users u ON l.assignedToId = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Role-based filtering: Staff can only see their assigned leads
        if ((session.user as any).role === "STAFF") {
            sql += " AND l.assignedToId = ?";
            params.push((session.user as any).id);
        } else if (assignedToId) {
            sql += " AND l.assignedToId = ?";
            params.push(assignedToId);
        }

        // Status filter
        if (status.length > 0) {
            sql += ` AND l.status IN (${status.map(() => '?').join(',')})`;
            params.push(...status);
        }

        // Source filter
        if (sourceId.length > 0) {
            sql += ` AND l.sourceId IN (${sourceId.map(() => '?').join(',')})`;
            params.push(...sourceId);
        }

        // Date filter
        if (dateFrom) {
            sql += " AND l.createdAt >= ?";
            params.push(new Date(dateFrom));
        }
        if (dateTo) {
            sql += " AND l.createdAt <= ?";
            params.push(new Date(dateTo + "T23:59:59.999Z"));
        }

        // Search filter
        if (search) {
            const searchLower = `%${search.toLowerCase()}%`;
            sql += " AND (LOWER(l.name) LIKE ? OR LOWER(l.email) LIKE ? OR LOWER(l.phone) LIKE ? OR LOWER(l.companyName) LIKE ?)";
            params.push(searchLower, searchLower, searchLower, searchLower);
        }

        sql += " ORDER BY l.createdAt DESC";

        const [leads]: any = await db.execute(sql, params);

        // Fetch tags for these leads
        const enrichedLeads = await Promise.all(leads.map(async (lead: any) => {
            const [tagRows]: any = await db.execute(`
                SELECT t.* 
                FROM tags t
                JOIN lead_tags lt ON t.id = lt.tagId
                WHERE lt.leadId = ?
            `, [lead.id]);

            return {
                ...lead,
                source: lead.sourceId ? { id: lead.sourceId, name: lead.sourceName } : null,
                assignedTo: lead.assignedToId ? { id: lead.assignedToId, name: lead.assignedToName, email: lead.assignedToEmail } : null,
                tags: tagRows.map((t: any) => ({ tag: t }))
            };
        }));

        // Tag ID filtering (if multiple tagIds provided)
        let finalLeads = enrichedLeads;
        if (tagIds.length > 0) {
            finalLeads = enrichedLeads.filter((lead: any) =>
                lead.tags.some((t: any) => tagIds.includes(t.tag.id))
            );
        }

        return NextResponse.json(finalLeads);
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

        const id = generateId();
        const finalAssignedToId = (assignedToId && assignedToId.trim() !== "") ? assignedToId : (session.user as any).id;
        const finalSourceId = (sourceId && sourceId.trim() !== "") ? sourceId : null;
        const now = new Date();

        await db.execute(`
            INSERT INTO leads (
                id, name, companyName, email, phone, address, city, country, website, 
                leadValue, description, status, sourceId, assignedToId, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, name, companyName, email, phone, address, city, country, website,
            leadValue ? parseFloat(leadValue) : null, description, status, finalSourceId, finalAssignedToId, now, now
        ]);

        // Save status history
        await db.execute(`
            INSERT INTO status_history (leadId, oldStatus, newStatus, changedBy, changedAt)
            VALUES (?, ?, ?, ?, ?)
        `, [id, "", status, session.user.name, now]);

        // Save tags
        if (tagIds && tagIds.length > 0) {
            for (const tagId of tagIds) {
                await db.execute(`
                    INSERT INTO lead_tags (leadId, tagId) VALUES (?, ?)
                `, [id, tagId]);
            }
        }

        return NextResponse.json({ id, ...body, createdAt: now, updatedAt: now }, { status: 201 });
    } catch (error) {
        console.error("Error creating lead:", error);
        return NextResponse.json(
            { error: "Failed to create lead" },
            { status: 500 }
        );
    }
}
