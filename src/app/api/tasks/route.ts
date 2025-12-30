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
        const staffId = searchParams.get("staffId"); // For admin filtering by staff
        const clientId = searchParams.get("clientId");
        const date = searchParams.get("date");
        const month = searchParams.get("month"); // Format: YYYY-MM
        const search = searchParams.get("search"); // Search query

        let query: any = db.collection("tasks");

        // Staff can only see their own tasks
        if ((session.user as any).role === "STAFF") {
            query = query.where("userId", "==", (session.user as any).id);
        } else if (staffId) {
            // Admin filtering by specific staff member
            query = query.where("userId", "==", staffId);
        } else if (userId) {
            query = query.where("userId", "==", userId);
        }

        const snapshot = await query.get();
        let tasks = await Promise.all(snapshot.docs.map(async (doc: any) => {
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

            // Fetch client info if clientId exists
            let client = null;
            if (data.clientId) {
                const clientDoc = await db.collection("clients").doc(data.clientId).get();
                if (clientDoc.exists) {
                    const clientData = clientDoc.data();
                    client = { id: clientDoc.id, name: clientData?.name, serviceType: clientData?.serviceType };
                }
            }

            // Fetch notes
            const notesSnapshot = await db.collection("taskNotes")
                .where("taskId", "==", doc.id)
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

            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate(),
                createdAt: data.createdAt?.toDate(),
                user,
                client,
                notes
            };
        }));

        // Filter by clientId (in-memory)
        if (clientId) {
            tasks = tasks.filter(t => t.clientId === clientId);
        }

        // Filter by search query (in-memory) - search in title, description, client name
        if (search) {
            const searchLower = search.toLowerCase();
            tasks = tasks.filter(t => {
                const titleMatch = t.title?.toLowerCase().includes(searchLower);
                const descMatch = t.description?.toLowerCase().includes(searchLower);
                const clientMatch = t.client?.name?.toLowerCase().includes(searchLower);
                return titleMatch || descMatch || clientMatch;
            });
        }

        // Filter by specific date (in-memory)
        if (date) {
            const filterDate = new Date(date);
            filterDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(filterDate);
            nextDay.setDate(nextDay.getDate() + 1);

            tasks = tasks.filter(t => {
                const tDate = t.date instanceof Date ? t.date : null;
                return tDate && tDate >= filterDate && tDate < nextDay;
            });
        }

        // Filter by month (in-memory)
        if (month) {
            const [year, monthNum] = month.split("-").map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59);

            tasks = tasks.filter(t => {
                const tDate = t.date instanceof Date ? t.date : null;
                return tDate && tDate >= startDate && tDate <= endDate;
            });
        }

        // Sort in-memory to avoid index requirements
        tasks.sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date.getTime() : 0;
            const dateB = b.date instanceof Date ? b.date.getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json(tasks);
    } catch (error: any) {
        console.error("Error fetching tasks:", error);
        return NextResponse.json(
            { error: "Failed to fetch tasks", details: error.message },
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
        const { title, description, date, hoursWorked, clientId, status = "IN_PROGRESS" } = body;

        if (!title || !date || hoursWorked === undefined) {
            return NextResponse.json(
                { error: "Title, date, and hoursWorked are required" },
                { status: 400 }
            );
        }

        const now = new Date();
        const taskData: any = {
            userId: (session.user as any).id,
            title,
            description: description || "",
            date: new Date(date),
            hoursWorked: parseFloat(hoursWorked),
            status,
            createdAt: now,
            updatedAt: now,
        };

        // Add clientId if provided
        if (clientId) {
            taskData.clientId = clientId;
        }

        const docRef = await db.collection("tasks").add(taskData);

        // Fetch client info for response
        let client = null;
        if (clientId) {
            const clientDoc = await db.collection("clients").doc(clientId).get();
            if (clientDoc.exists) {
                const clientData = clientDoc.data();
                client = { id: clientDoc.id, name: clientData?.name, serviceType: clientData?.serviceType };
            }
        }

        const result = {
            id: docRef.id,
            ...taskData,
            user: { id: (session.user as any).id, name: session.user.name, email: session.user.email },
            client,
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
