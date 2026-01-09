import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// GET all sources
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [rows]: any = await db.execute("SELECT * FROM lead_sources ORDER BY name ASC");

        return NextResponse.json(rows);
    } catch (error) {
        console.error("Error fetching sources:", error);
        return NextResponse.json(
            { error: "Failed to fetch sources" },
            { status: 500 }
        );
    }
}

// POST create new source
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name } = await request.json();

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        // Check if source already exists
        const [existing]: any = await db.execute("SELECT id, name FROM lead_sources WHERE name = ? LIMIT 1", [name]);

        if (existing && existing.length > 0) {
            return NextResponse.json(existing[0]);
        }

        const id = generateId();
        const now = new Date();

        await db.execute("INSERT INTO lead_sources (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)", [id, name, now, now]);

        return NextResponse.json({ id, name, createdAt: now }, { status: 201 });
    } catch (error) {
        console.error("Error creating source:", error);
        return NextResponse.json(
            { error: "Failed to create source" },
            { status: 500 }
        );
    }
}
