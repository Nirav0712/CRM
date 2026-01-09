import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// GET leave requests
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get("status");

        let sql = `
            SELECT lr.*, u.name as userName, u.email as userEmail
            FROM leave_requests lr
            LEFT JOIN users u ON lr.userId = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Staff can only see their own leave requests
        if ((session.user as any).role === "STAFF") {
            sql += " AND lr.userId = ?";
            params.push((session.user as any).id);
        }

        if (statusFilter) {
            sql += " AND lr.status = ?";
            params.push(statusFilter);
        }

        sql += " ORDER BY lr.createdAt DESC";

        const [rows]: any = await db.execute(sql, params);

        const leaveRequests = rows.map((r: any) => ({
            ...r,
            user: { id: r.userId, name: r.userName, email: r.userEmail }
        }));

        return NextResponse.json(leaveRequests);
    } catch (error: any) {
        console.error("Error fetching leave requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch leave requests", details: error.message },
            { status: 500 }
        );
    }
}

// POST create leave request
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { startDate, endDate, leaveType, reason } = body;

        if (!startDate || !endDate || !leaveType) {
            return NextResponse.json(
                { error: "Start date, end date, and leave type are required" },
                { status: 400 }
            );
        }

        const id = generateId();
        const now = new Date();
        const userId = (session.user as any).id;

        await db.execute(`
            INSERT INTO leave_requests (id, userId, startDate, endDate, leaveType, reason, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, userId, new Date(startDate), new Date(endDate), leaveType, reason || null, "PENDING", now, now]);

        return NextResponse.json({
            id,
            userId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            leaveType,
            reason,
            status: "PENDING",
            createdAt: now,
            updatedAt: now
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating leave request:", error);
        return NextResponse.json(
            { error: "Failed to create leave request", details: error.message },
            { status: 500 }
        );
    }
}
