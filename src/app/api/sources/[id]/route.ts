import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

// PATCH - Update source
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();
        const { name } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const now = new Date();
        await db.execute("UPDATE lead_sources SET name = ?, updatedAt = ? WHERE id = ?", [name.trim(), now, id]);

        const [rows]: any = await db.execute("SELECT * FROM lead_sources WHERE id = ?", [id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: "Source not found" }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error: any) {
        console.error("Error updating source:", error);
        return NextResponse.json(
            { error: "Failed to update source", details: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete source
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        // Check if source is in use
        const [leadsWithSource]: any = await db.execute("SELECT id FROM leads WHERE sourceId = ? LIMIT 1", [id]);

        if (leadsWithSource && leadsWithSource.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete source that is in use by leads" },
                { status: 400 }
            );
        }

        await db.execute("DELETE FROM lead_sources WHERE id = ?", [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting source:", error);
        return NextResponse.json(
            { error: "Failed to delete source", details: error.message },
            { status: 500 }
        );
    }
}
