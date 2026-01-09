import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

// PATCH - Update tag
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
        const { name, color } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const now = new Date();
        const updateFields = ["name = ?", "updatedAt = ?"];
        const updateParams = [name.trim(), now];

        if (color) {
            updateFields.push("color = ?");
            updateParams.push(color);
        }

        updateParams.push(id);

        await db.execute(`
            UPDATE tags 
            SET ${updateFields.join(", ")}
            WHERE id = ?
        `, updateParams);

        const [rows]: any = await db.execute("SELECT * FROM tags WHERE id = ?", [id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: "Tag not found" }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error: any) {
        console.error("Error updating tag:", error);
        return NextResponse.json(
            { error: "Failed to update tag", details: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete tag
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

        // Check if tag is in use by any leads
        const [leadsWithTag]: any = await db.execute("SELECT leadId FROM lead_tags WHERE tagId = ? LIMIT 1", [id]);

        if (leadsWithTag && leadsWithTag.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete tag that is in use by leads" },
                { status: 400 }
            );
        }

        await db.execute("DELETE FROM tags WHERE id = ?", [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting tag:", error);
        return NextResponse.json(
            { error: "Failed to delete tag", details: error.message },
            { status: 500 }
        );
    }
}
