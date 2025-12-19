import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET leave requests
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const where: any = {};

        // Staff can only see their own leave requests
        if (session.user.role === "STAFF") {
            where.userId = session.user.id;
        }

        if (status) {
            where.status = status;
        }

        const leaveRequests = await prisma.leaveRequest.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(leaveRequests);
    } catch (error) {
        console.error("Error fetching leave requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch leave requests" },
            { status: 500 }
        );
    }
}

// POST create leave request
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { startDate, endDate, leaveType, reason } = body;

        if (!startDate || !endDate || !leaveType) {
            return NextResponse.json(
                { error: "Start date, end date, and leave type are required" },
                { status: 400 }
            );
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId: session.user.id,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                leaveType,
                reason,
                status: "PENDING",
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        return NextResponse.json(leaveRequest, { status: 201 });
    } catch (error) {
        console.error("Error creating leave request:", error);
        return NextResponse.json(
            { error: "Failed to create leave request" },
            { status: 500 }
        );
    }
}
