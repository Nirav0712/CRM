import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

// GET all tags
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const snapshot = await db.collection("tags").orderBy("name", "asc").get();
        const tags = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json(tags);
    } catch (error) {
        console.error("Error fetching tags:", error);
        return NextResponse.json(
            { error: "Failed to fetch tags" },
            { status: 500 }
        );
    }
}

// POST create new tag
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, color = "#3b82f6" } = await request.json();

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        // Check if tag already exists
        const existingSnapshot = await db.collection("tags")
            .where("name", "==", name)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            const existing = existingSnapshot.docs[0];
            return NextResponse.json({ id: existing.id, ...existing.data() });
        }

        const newTag = {
            name,
            color,
            createdAt: new Date()
        };

        const docRef = await db.collection("tags").add(newTag);

        return NextResponse.json({ id: docRef.id, ...newTag }, { status: 201 });
    } catch (error) {
        console.error("Error creating tag:", error);
        return NextResponse.json(
            { error: "Failed to create tag" },
            { status: 500 }
        );
    }
}
