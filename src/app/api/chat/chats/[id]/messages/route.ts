import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// GET messages for a chat
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const chatId = params.id;

        const [rows]: any = await db.execute(`
            SELECT * FROM messages 
            WHERE chatId = ? 
            ORDER BY timestamp ASC 
            LIMIT 100
        `, [chatId]);

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("Error fetching messages:", error);
        return NextResponse.json(
            { error: "Failed to fetch messages", details: error.message },
            { status: 500 }
        );
    }
}

// POST send message
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const chatId = params.id;
        const body = await request.json();
        const { text, senderName, senderRole } = body;

        if (!text) {
            return NextResponse.json({ error: "Message text is required" }, { status: 400 });
        }

        const id = generateId();
        const timestamp = Date.now();
        const senderId = (session.user as any).id;

        // Insert message
        await db.execute(`
            INSERT INTO messages (id, chatId, senderId, senderName, senderRole, text, timestamp, readBy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, chatId, senderId, senderName, senderRole || 'STAFF', text, timestamp, JSON.stringify([senderId])]);

        // Update chat last message
        await db.execute(`
            UPDATE chats 
            SET lastMessage = ?, lastMessageTime = ?, lastMessageSender = ?
            WHERE id = ?
        `, [text, timestamp, senderName, chatId]);

        return NextResponse.json({
            id,
            chatId,
            senderId,
            senderName,
            senderRole,
            text,
            timestamp,
            readBy: [senderId]
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error sending message:", error);
        return NextResponse.json(
            { error: "Failed to send message", details: error.message },
            { status: 500 }
        );
    }
}
