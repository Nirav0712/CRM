import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET single task
export async function GET(
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
            include: {
                user: { select: { id: true, name: true, email: true } },
                notes: {
                    include: {
                        user: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Staff can only view their own tasks
        if (session.user.role === "STAFF" && task.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(task);
    } catch (error) {
        console.error("Error fetching task:", error);
        return NextResponse.json(
            { error: "Failed to fetch task" },
            { status: 500 }
        );
    }
}

// PUT update task
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const existingTask = await prisma.task.findUnique({
            where: { id: params.id },
        });

        if (!existingTask) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Staff can only edit their own tasks
        if (session.user.role === "STAFF" && existingTask.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, hoursWorked, status, date } = body;

        const task = await prisma.task.update({
            where: { id: params.id },
            data: {
                title,
                description,
                hoursWorked: hoursWorked !== undefined ? parseFloat(hoursWorked) : undefined,
                status,
                date: date ? new Date(date) : undefined,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                notes: {
                    include: {
                        user: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error("Error updating task:", error);
        return NextResponse.json(
            { error: "Failed to update task" },
            { status: 500 }
        );
    }
}

// DELETE task
export async function DELETE(
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

        // Staff can only delete their own tasks, admin can delete any
        if (session.user.role === "STAFF" && task.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.task.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Task deleted" });
    } catch (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json(
            { error: "Failed to delete task" },
            { status: 500 }
        );
    }
}
