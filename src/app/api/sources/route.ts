import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all sources
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sources = await prisma.leadSource.findMany({
            orderBy: { name: "asc" },
        });

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
        const existing = await prisma.leadSource.findUnique({
            where: { name },
        });

        if (existing) {
            return NextResponse.json(existing);
        }

        const source = await prisma.leadSource.create({
            data: { name },
        });

        return NextResponse.json(source, { status: 201 });
    } catch (error) {
        console.error("Error creating source:", error);
        return NextResponse.json(
            { error: "Failed to create source" },
            { status: 500 }
        );
    }
}
