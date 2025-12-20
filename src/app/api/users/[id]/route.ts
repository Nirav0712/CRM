export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

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
        const leadsSnapshot = await db.collection("leads")
            .where("assignedToId", "==", params.id)
            .limit(1)
            .get();

        if (!leadsSnapshot.empty) {
            return NextResponse.json(
                { error: `Cannot delete user with assigned leads. Reassign leads first.` },
                { status: 400 }
            );
        }

        await db.collection("users").doc(params.id).delete();

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: "Failed to delete user" },
            { status: 500 }
        );
    }
}
