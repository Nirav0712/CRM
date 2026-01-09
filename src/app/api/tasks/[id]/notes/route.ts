import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

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

        const [taskRows]: any = await db.execute("SELECT userId FROM tasks WHERE id = ?", [params.id]);

        if (taskRows.length === 0) {
            return NextResponse.json({ error: "Task found" }, { status: 404 });
        }

        const taskData = taskRows[0];

        // Staff can only add notes to their own tasks, admin can add to any
        if ((session.user as any).role === "STAFF" && taskData.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const id = generateId();
        const now = new Date();
        const userId = (session.user as any).id;

        await db.execute(`
            INSERT INTO task_notes (id, taskId, userId, content, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, params.id, userId, content, now, now]);

        return NextResponse.json({
            id,
            taskId: params.id,
            userId,
            content,
            createdAt: now,
            updatedAt: now,
            user: { id: userId, name: session.user.name }
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error adding note:", error);
        return NextResponse.json(
            { error: "Failed to add note", details: error.message },
            { status: 500 }
        );
    }
}
