import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all tags
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tags = await prisma.tag.findMany({
            orderBy: { name: "asc" },
        });

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
        const existing = await prisma.tag.findUnique({
            where: { name },
        });

        if (existing) {
            return NextResponse.json(existing);
        }

        const tag = await prisma.tag.create({
            data: { name, color },
        });

        return NextResponse.json(tag, { status: 201 });
    } catch (error) {
        console.error("Error creating tag:", error);
        return NextResponse.json(
            { error: "Failed to create tag" },
            { status: 500 }
        );
    }
}
