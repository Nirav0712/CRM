import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all leads (filtered by role)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.getAll("status");
        const sourceId = searchParams.getAll("sourceId");
        const assignedToId = searchParams.get("assignedToId");
        const tagIds = searchParams.getAll("tagId");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        // Build where clause
        const where: any = {};

        // Role-based filtering: Staff can only see their assigned leads
        if (session.user.role === "STAFF") {
            where.assignedToId = session.user.id;
        } else if (assignedToId) {
            where.assignedToId = assignedToId;
        }

        // Search filter
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
                { companyName: { contains: search } },
            ];
        }

        // Status filter
        if (status.length > 0) {
            where.status = { in: status };
        }

        // Source filter
        if (sourceId.length > 0) {
            where.sourceId = { in: sourceId };
        }

        // Tag filter
        if (tagIds.length > 0) {
            where.tags = {
                some: {
                    tagId: { in: tagIds },
                },
            };
        }

        // Date filter
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
            }
        }

        const leads = await prisma.lead.findMany({
            where,
            include: {
                source: true,
                assignedTo: {
                    select: { id: true, name: true, email: true },
                },
                tags: {
                    include: { tag: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(leads);
    } catch (error) {
        console.error("Error fetching leads:", error);
        return NextResponse.json(
            { error: "Failed to fetch leads" },
            { status: 500 }
        );
    }
}

// POST create new lead
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            name,
            companyName,
            email,
            phone,
            address,
            city,
            country,
            website,
            leadValue,
            description,
            status = "PENDING",
            sourceId,
            assignedToId,
            tagIds = [],
        } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        // Use the current user as default assignee if not specified
        const finalAssignedToId = assignedToId || session.user.id;

        const lead = await prisma.lead.create({
            data: {
                name,
                companyName,
                email,
                phone,
                address,
                city,
                country,
                website,
                leadValue: leadValue ? parseFloat(leadValue) : null,
                description,
                status,
                sourceId,
                assignedToId: finalAssignedToId,
                tags: {
                    create: tagIds.map((tagId: string) => ({
                        tagId,
                    })),
                },
                statusHistory: {
                    create: {
                        oldStatus: "",
                        newStatus: status,
                        changedBy: session.user.name,
                    },
                },
            },
            include: {
                source: true,
                assignedTo: {
                    select: { id: true, name: true, email: true },
                },
                tags: {
                    include: { tag: true },
                },
            },
        });

        return NextResponse.json(lead, { status: 201 });
    } catch (error) {
        console.error("Error creating lead:", error);
        return NextResponse.json(
            { error: "Failed to create lead" },
            { status: 500 }
        );
    }
}
