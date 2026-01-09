import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

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

        const [taskRows]: any = await db.execute(`
            SELECT t.*, u.name as userName, u.email as userEmail,
                   c.name as clientName, c.serviceType as clientServiceType
            FROM tasks t
            LEFT JOIN users u ON t.userId = u.id
            LEFT JOIN clients c ON t.clientId = c.id
            WHERE t.id = ?
        `, [params.id]);

        if (!taskRows || taskRows.length === 0) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const task = taskRows[0];

        // Staff can only view their own tasks
        if ((session.user as any).role === "STAFF" && task.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch notes
        const [noteRows]: any = await db.execute(`
            SELECT tn.*, u.name as userName
            FROM task_notes tn
            LEFT JOIN users u ON tn.userId = u.id
            WHERE tn.taskId = ?
            ORDER BY tn.createdAt DESC
        `, [params.id]);

        return NextResponse.json({
            ...task,
            user: task.userId ? { id: task.userId, name: task.userName, email: task.userEmail } : null,
            client: task.clientId ? { id: task.clientId, name: task.clientName, serviceType: task.clientServiceType } : null,
            notes: noteRows.map((n: any) => ({
                ...n,
                user: n.userId ? { id: n.userId, name: n.userName } : null
            }))
        });
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

        const [existingRows]: any = await db.execute("SELECT * FROM tasks WHERE id = ?", [params.id]);

        if (!existingRows || existingRows.length === 0) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const existingTask = existingRows[0];

        // Staff can only edit their own tasks
        if ((session.user as any).role === "STAFF" && existingTask.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, hoursWorked, status, date } = body;

        const fieldsToUpdate: string[] = ["updatedAt = ?"];
        const updateParams: any[] = [new Date()];

        if (title !== undefined) { fieldsToUpdate.push("title = ?"); updateParams.push(title); }
        if (description !== undefined) { fieldsToUpdate.push("description = ?"); updateParams.push(description); }
        if (hoursWorked !== undefined) { fieldsToUpdate.push("hoursWorked = ?"); updateParams.push(parseFloat(hoursWorked)); }
        if (status !== undefined) { fieldsToUpdate.push("status = ?"); updateParams.push(status); }
        if (date !== undefined) { fieldsToUpdate.push("date = ?"); updateParams.push(new Date(date)); }

        updateParams.push(params.id);
        await db.execute(`UPDATE tasks SET ${fieldsToUpdate.join(", ")} WHERE id = ?`, updateParams);

        return NextResponse.json({
            id: params.id,
            ...existingTask,
            ...body,
            updatedAt: updateParams[0]
        });
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

        const [existingRows]: any = await db.execute("SELECT * FROM tasks WHERE id = ?", [params.id]);

        if (!existingRows || existingRows.length === 0) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const taskData = existingRows[0];

        // Staff can only delete their own tasks, admin can delete any
        if ((session.user as any).role === "STAFF" && taskData.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Associated notes should be handled by ON DELETE CASCADE in the database schema
        await db.execute("DELETE FROM tasks WHERE id = ?", [params.id]);

        return NextResponse.json({ message: "Task deleted" });
    } catch (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json(
            { error: "Failed to delete task" },
            { status: 500 }
        );
    }
}
