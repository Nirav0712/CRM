import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// GET all users (for assignment dropdown)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [rows]: any = await db.execute("SELECT id, name, email, role, createdAt FROM users ORDER BY name ASC");

        return NextResponse.json(rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

// POST create new user (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if ((session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { email, password, name, role = "STAFF" } = await request.json();

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Email, password, and name are required" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const [existing]: any = await db.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);

        if (existing && existing.length > 0) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = generateId();
        const now = new Date();

        await db.execute(`
            INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, email, hashedPassword, name, role, now, now]);

        const result = {
            id,
            name,
            email,
            role,
            createdAt: now,
        };

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
        );
    }
}
