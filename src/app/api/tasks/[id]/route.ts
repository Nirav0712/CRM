export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

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

        const taskDoc = await db.collection("tasks").doc(params.id).get();

        if (!taskDoc.exists) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const taskData = taskDoc.data()!;

        // Staff can only view their own tasks
        if ((session.user as any).role === "STAFF" && taskData.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch user info
        let user = null;
        if (taskData.userId) {
            const userDoc = await db.collection("users").doc(taskData.userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                user = { id: userDoc.id, name: userData?.name, email: userData?.email };
            }
        }

        // Fetch notes
        const notesSnapshot = await db.collection("taskNotes")
            .where("taskId", "==", params.id)
            .get();

        const notes = await Promise.all(notesSnapshot.docs.map(async (noteDoc: any) => {
            const noteData = noteDoc.data();
            let noteUser = null;
            if (noteData.userId) {
                const noteUserDoc = await db.collection("users").doc(noteData.userId).get();
                if (noteUserDoc.exists) {
                    noteUser = { id: noteUserDoc.id, name: noteUserDoc.data()?.name };
                }
            }
            return {
                id: noteDoc.id,
                ...noteData,
                createdAt: noteData.createdAt?.toDate(),
                user: noteUser
            };
        }));

        // Sort notes in-memory
        notes.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({
            id: taskDoc.id,
            ...taskData,
            date: taskData.date?.toDate(),
            createdAt: taskData.createdAt?.toDate(),
            user,
            notes
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

        const taskRef = db.collection("tasks").doc(params.id);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const existingTask = taskDoc.data()!;

        // Staff can only edit their own tasks
        if ((session.user as any).role === "STAFF" && existingTask.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, hoursWorked, status, date } = body;

        const updateData: any = {
            updatedAt: new Date()
        };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (hoursWorked !== undefined) updateData.hoursWorked = parseFloat(hoursWorked);
        if (status !== undefined) updateData.status = status;
        if (date !== undefined) updateData.date = new Date(date);

        await taskRef.update(updateData);

        return NextResponse.json({
            id: params.id,
            ...existingTask,
            ...updateData,
            date: updateData.date || existingTask.date?.toDate()
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

        const taskRef = db.collection("tasks").doc(params.id);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const taskData = taskDoc.data()!;

        // Staff can only delete their own tasks, admin can delete any
        if ((session.user as any).role === "STAFF" && taskData.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await taskRef.delete();

        // Also delete associated notes
        const notesSnapshot = await db.collection("taskNotes").where("taskId", "==", params.id).get();
        const batch = db.batch();
        notesSnapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();

        return NextResponse.json({ message: "Task deleted" });
    } catch (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json(
            { error: "Failed to delete task" },
            { status: 500 }
        );
    }
}
