export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

// POST add note to task (admin can add notes/responses)
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const taskRef = db.collection("tasks").doc(params.id);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const taskData = taskDoc.data()!;

        // Staff can only add notes to their own tasks, admin can add to any
        if ((session.user as any).role === "STAFF" && taskData.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const now = new Date();
        const noteData = {
            taskId: params.id,
            userId: (session.user as any).id,
            content,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection("taskNotes").add(noteData);

        const result = {
            id: docRef.id,
            ...noteData,
            user: { id: (session.user as any).id, name: session.user.name }
        };

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Error adding note:", error);
        return NextResponse.json(
            { error: "Failed to add note" },
            { status: 500 }
        );
    }
}
