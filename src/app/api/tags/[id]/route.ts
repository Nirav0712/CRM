import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

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

        const updateData: any = {
            name: name.trim(),
            updatedAt: new Date()
        };

        if (color) {
            updateData.color = color;
        }

        await db.collection("tags").doc(id).update(updateData);

        const doc = await db.collection("tags").doc(id).get();
        const data = doc.data();

        return NextResponse.json({
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate(),
            updatedAt: data?.updatedAt?.toDate()
        });
    } catch (error) {
        console.error("Error updating tag:", error);
        return NextResponse.json(
            { error: "Failed to update tag" },
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
        const leadsWithTag = await db.collection("leads")
            .where("tagIds", "array-contains", id)
            .limit(1)
            .get();

        if (!leadsWithTag.empty) {
            return NextResponse.json(
                { error: "Cannot delete tag that is in use by leads" },
                { status: 400 }
            );
        }

        await db.collection("tags").doc(id).delete();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting tag:", error);
        return NextResponse.json(
            { error: "Failed to delete tag" },
            { status: 500 }
        );
    }
}
