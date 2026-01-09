import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

// DELETE user (admin only)
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

        // Prevent deleting yourself
        if (params.id === (session.user as any).id) {
            return NextResponse.json(
                { error: "Cannot delete your own account" },
                { status: 400 }
            );
        }

        // Check if user has leads assigned
        const [leads]: any = await db.execute("SELECT id FROM leads WHERE assignedToId = ? LIMIT 1", [params.id]);

        if (leads && leads.length > 0) {
            return NextResponse.json(
                { error: `Cannot delete user with assigned leads. Reassign leads first.` },
                { status: 400 }
            );
        }

        await db.execute("DELETE FROM users WHERE id = ?", [params.id]);

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: "Failed to delete user", details: error.message },
            { status: 500 }
        );
    }
}
