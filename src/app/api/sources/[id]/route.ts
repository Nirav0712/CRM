import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

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

        await db.collection("sources").doc(id).update({
            name: name.trim(),
            updatedAt: new Date()
        });

        const doc = await db.collection("sources").doc(id).get();
        const data = doc.data();

        return NextResponse.json({
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate(),
            updatedAt: data?.updatedAt?.toDate()
        });
    } catch (error) {
        console.error("Error updating source:", error);
        return NextResponse.json(
            { error: "Failed to update source" },
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
        const leadsWithSource = await db.collection("leads")
            .where("sourceId", "==", id)
            .limit(1)
            .get();

        if (!leadsWithSource.empty) {
            return NextResponse.json(
                { error: "Cannot delete source that is in use by leads" },
                { status: 400 }
            );
        }

        await db.collection("sources").doc(id).delete();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting source:", error);
        return NextResponse.json(
            { error: "Failed to delete source" },
            { status: 500 }
        );
    }
}
