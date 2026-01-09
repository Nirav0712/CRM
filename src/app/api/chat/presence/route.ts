import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET presence for one or more users
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userIds = searchParams.get("userIds")?.split(",") || [];

        if (userIds.length === 0) {
            return NextResponse.json([]);
        }

        const placeholders = userIds.map(() => "?").join(",");
        const [rows]: any = await db.execute(`
            SELECT userId, status, lastSeen FROM user_presence 
            WHERE userId IN (${placeholders})
        `, userIds);

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("Error fetching presence:", error);
        return NextResponse.json(
            { error: "Failed to fetch presence", details: error.message },
            { status: 500 }
        );
    }
}

// POST update current user presence
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await request.json();
        const { status } = body;

        if (!status || !['online', 'offline'].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const lastSeen = Date.now();

        await db.execute(`
            INSERT INTO user_presence (userId, status, lastSeen)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), lastSeen = VALUES(lastSeen)
        `, [userId, status, lastSeen]);

        return NextResponse.json({ userId, status, lastSeen });
    } catch (error: any) {
        console.error("Error updating presence:", error);
        return NextResponse.json(
            { error: "Failed to update presence", details: error.message },
            { status: 500 }
        );
    }
}
