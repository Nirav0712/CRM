import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

        const task = await prisma.task.findUnique({
            where: { id: params.id },
        });

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Staff can only add notes to their own tasks, admin can add to any
        if (session.user.role === "STAFF" && task.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const note = await prisma.taskNote.create({
            data: {
                taskId: params.id,
                userId: session.user.id,
                content,
            },
            include: {
                user: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error("Error adding note:", error);
        return NextResponse.json(
            { error: "Failed to add note" },
            { status: 500 }
        );
    }
}
