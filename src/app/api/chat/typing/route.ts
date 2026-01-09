import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET typing status for a chat
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const chatId = searchParams.get("chatId");

        if (!chatId) {
            return NextResponse.json({ error: "chatId is required" }, { status: 400 });
        }

        // Only return typing users from last 10 seconds
        const now = Date.now();
        const [rows]: any = await db.execute(`
            SELECT userId, userName, timestamp FROM user_typing 
            WHERE chatId = ? AND timestamp > ?
        `, [chatId, now - 10000]);

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("Error fetching typing status:", error);
        return NextResponse.json(
            { error: "Failed to fetch typing status", details: error.message },
            { status: 500 }
        );
    }
}

// POST update typing status
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await request.json();
        const { chatId, userName, isTyping } = body;

        if (!chatId) {
            return NextResponse.json({ error: "chatId is required" }, { status: 400 });
        }

        if (isTyping) {
            const timestamp = Date.now();
            await db.execute(`
                INSERT INTO user_typing (chatId, userId, userName, timestamp)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE timestamp = VALUES(timestamp)
            `, [chatId, userId, userName, timestamp]);
        } else {
            await db.execute("DELETE FROM user_typing WHERE chatId = ? AND userId = ?", [chatId, userId]);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error updating typing status:", error);
        return NextResponse.json(
            { error: "Failed to update typing status", details: error.message },
            { status: 500 }
        );
    }
}
