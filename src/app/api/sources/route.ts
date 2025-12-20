import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

// GET all sources
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const snapshot = await db.collection("leadSources").orderBy("name", "asc").get();
        const sources = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json(sources);
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
        const existingSnapshot = await db.collection("leadSources")
            .where("name", "==", name)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            const existing = existingSnapshot.docs[0];
            return NextResponse.json({ id: existing.id, ...existing.data() });
        }

        const newSource = {
            name,
            createdAt: new Date()
        };

        const docRef = await db.collection("leadSources").add(newSource);

        return NextResponse.json({ id: docRef.id, ...newSource }, { status: 201 });
    } catch (error) {
        console.error("Error creating source:", error);
        return NextResponse.json(
            { error: "Failed to create source" },
            { status: 500 }
        );
    }
}
