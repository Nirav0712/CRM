import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';
import bcrypt from "bcryptjs";

// GET all users (for assignment dropdown)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const snapshot = await db.collection("users").orderBy("name", "asc").get();
        const users = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                email: data.email,
                role: data.role,
                createdAt: data.createdAt?.toDate(),
            };
        });

        return NextResponse.json(users);
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
        const existingSnapshot = await db.collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const now = new Date();
        const userData = {
            email,
            password: hashedPassword,
            name,
            role,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection("users").add(userData);

        const result = {
            id: docRef.id,
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
