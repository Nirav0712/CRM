import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

// GET tasks
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const date = searchParams.get("date");
        const month = searchParams.get("month"); // Format: YYYY-MM

        let query: any = db.collection("tasks");

        // Staff can only see their own tasks
        if ((session.user as any).role === "STAFF") {
            query = query.where("userId", "==", (session.user as any).id);
        } else if (userId) {
            query = query.where("userId", "==", userId);
        }

        // Filter by specific date
        if (date) {
            const taskDate = new Date(date);
            taskDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(taskDate);
            nextDay.setDate(nextDay.getDate() + 1);

            query = query.where("date", ">=", taskDate).where("date", "<", nextDay);
        }

        // Filter by month
        if (month) {
            const [year, monthNum] = month.split("-").map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59);
            query = query.where("date", ">=", startDate).where("date", "<=", endDate);
        }

        const snapshot = await query.orderBy("date", "desc").get();
        const tasks = await Promise.all(snapshot.docs.map(async (doc: any) => {
            const data = doc.data();

            // Fetch user info
            let user = null;
            if (data.userId) {
                const userDoc = await db.collection("users").doc(data.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    user = { id: userDoc.id, name: userData?.name, email: userData?.email };
                }
            }

            // Fetch notes
            const notesSnapshot = await db.collection("taskNotes")
                .where("taskId", "==", doc.id)
                .orderBy("createdAt", "desc")
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

            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate(),
                createdAt: data.createdAt?.toDate(),
                user,
                notes
            };
        }));

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return NextResponse.json(
            { error: "Failed to fetch tasks" },
            { status: 500 }
        );
    }
}

// POST create task (staff logs work hours)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, date, hoursWorked, status = "IN_PROGRESS" } = body;

        if (!title || !date || hoursWorked === undefined) {
            return NextResponse.json(
                { error: "Title, date, and hoursWorked are required" },
                { status: 400 }
            );
        }

        const now = new Date();
        const taskData = {
            userId: (session.user as any).id,
            title,
            description,
            date: new Date(date),
            hoursWorked: parseFloat(hoursWorked),
            status,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection("tasks").add(taskData);

        const result = {
            id: docRef.id,
            ...taskData,
            user: { id: (session.user as any).id, name: session.user.name, email: session.user.email },
            notes: []
        };

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Error creating task:", error);
        return NextResponse.json(
            { error: "Failed to create task" },
            { status: 500 }
        );
    }
}
