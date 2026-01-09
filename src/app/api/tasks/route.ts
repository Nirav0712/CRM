import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

export const dynamic = 'force-dynamic';

// GET tasks
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userIdFilter = searchParams.get("userId");
        const staffId = searchParams.get("staffId");
        const clientId = searchParams.get("clientId");
        const date = searchParams.get("date");
        const month = searchParams.get("month");
        const search = searchParams.get("search");

        let sql = `
            SELECT t.*, 
                   u.name as userName, u.email as userEmail,
                   c.name as clientName, c.serviceType as clientServiceType
            FROM tasks t
            LEFT JOIN users u ON t.userId = u.id
            LEFT JOIN clients c ON t.clientId = c.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Staff can only see their own tasks
        if ((session.user as any).role === "STAFF") {
            sql += " AND t.userId = ?";
            params.push((session.user as any).id);
        } else if (staffId) {
            sql += " AND t.userId = ?";
            params.push(staffId);
        } else if (userIdFilter) {
            sql += " AND t.userId = ?";
            params.push(userIdFilter);
        }

        if (clientId) {
            sql += " AND t.clientId = ?";
            params.push(clientId);
        }

        if (date) {
            sql += " AND DATE(t.date) = DATE(?)";
            params.push(date);
        }

        if (month) {
            const [year, monthNum] = month.split("-");
            sql += " AND YEAR(t.date) = ? AND MONTH(t.date) = ?";
            params.push(year, monthNum);
        }

        if (search) {
            const searchLower = `%${search.toLowerCase()}%`;
            sql += " AND (LOWER(t.title) LIKE ? OR LOWER(t.description) LIKE ? OR LOWER(c.name) LIKE ?)";
            params.push(searchLower, searchLower, searchLower);
        }

        sql += " ORDER BY t.date DESC";

        const [tasks]: any = await db.execute(sql, params);

        // Fetch notes for each task
        const enrichedTasks = await Promise.all(tasks.map(async (task: any) => {
            const [noteRows]: any = await db.execute(`
                SELECT tn.*, u.name as userName
                FROM task_notes tn
                LEFT JOIN users u ON tn.userId = u.id
                WHERE tn.taskId = ?
                ORDER BY tn.createdAt DESC
            `, [task.id]);

            return {
                ...task,
                hoursWorked: Number(task.hoursWorked),
                user: task.userId ? { id: task.userId, name: task.userName, email: task.userEmail } : null,
                client: task.clientId ? { id: task.clientId, name: task.clientName, serviceType: task.clientServiceType } : null,
                notes: noteRows.map((n: any) => ({
                    ...n,
                    user: n.userId ? { id: n.userId, name: n.userName } : null
                }))
            };
        }));

        return NextResponse.json(enrichedTasks);
    } catch (error: any) {
        console.error("Error fetching tasks:", error);
        return NextResponse.json(
            { error: "Failed to fetch tasks", details: error.message },
            { status: 500 }
        );
    }
}

// POST create task
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

        const id = generateId();
        const now = new Date();
        const userId = (session.user as any).id;

        await db.execute(`
            INSERT INTO tasks (id, userId, title, description, date, hoursWorked, status, clientId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, userId, title, description || "", new Date(date), parseFloat(hoursWorked), status, clientId || null, now, now
        ]);

        // Fetch client info for response
        let client = null;
        if (clientId) {
            const [clientRows]: any = await db.execute("SELECT id, name, serviceType FROM clients WHERE id = ?", [clientId]);
            if (clientRows && clientRows.length > 0) {
                client = clientRows[0];
            }
        }

        return NextResponse.json({
            id,
            title,
            description,
            date: new Date(date),
            hoursWorked,
            status,
            clientId,
            userId,
            user: { id: userId, name: session.user.name, email: session.user.email },
            client,
            notes: [],
            createdAt: now,
            updatedAt: now
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating task:", error);
        return NextResponse.json(
            { error: "Failed to create task" },
            { status: 500 }
        );
    }
}
