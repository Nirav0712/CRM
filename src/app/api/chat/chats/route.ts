import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// GET all chats for the current user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const isAdmin = (session.user as any).role === "ADMIN";

        let sql = "SELECT * FROM chats";
        const params: any[] = [];

        // If not admin, only show chats where user is a participant or group chats
        if (!isAdmin) {
            sql += " WHERE type = 'group' OR JSON_CONTAINS(participantIds, CAST(? AS JSON), '$')";
            params.push(JSON.stringify(userId));
        }

        sql += " ORDER BY lastMessageTime DESC";

        const [rows]: any = await db.execute(sql, params);

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("Error fetching chats:", error);
        return NextResponse.json(
            { error: "Failed to fetch chats", details: error.message },
            { status: 500 }
        );
    }
}

// POST create or get direct chat
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { type, participantIds, name } = body;

        if (type === 'direct') {
            if (!participantIds || participantIds.length !== 2) {
                return NextResponse.json({ error: "Direct chat requires 2 participants" }, { status: 400 });
            }

            // Consistent ID for direct chat
            const chatId = participantIds.sort().join('_');

            // Check if exists
            const [existing]: any = await db.execute("SELECT * FROM chats WHERE id = ?", [chatId]);
            if (existing && existing.length > 0) {
                return NextResponse.json(existing[0]);
            }

            // Create new
            const now = Date.now();
            await db.execute(`
                INSERT INTO chats (id, type, participantIds, createdAt)
                VALUES (?, ?, ?, ?)
            `, [chatId, 'direct', JSON.stringify(participantIds), now]);

            return NextResponse.json({ id: chatId, type: 'direct', participantIds, createdAt: now }, { status: 201 });
        } else if (type === 'group') {
            const id = generateId();
            const now = Date.now();
            await db.execute(`
                INSERT INTO chats (id, type, name, participantIds, createdAt)
                VALUES (?, ?, ?, ?, ?)
            `, [id, 'group', name, JSON.stringify(participantIds || []), now]);

            return NextResponse.json({ id, type: 'group', name, participantIds, createdAt: now }, { status: 201 });
        }

        return NextResponse.json({ error: "Invalid chat type" }, { status: 400 });
    } catch (error: any) {
        console.error("Error creating chat:", error);
        return NextResponse.json(
            { error: "Failed to create chat", details: error.message },
            { status: 500 }
        );
    }
}
