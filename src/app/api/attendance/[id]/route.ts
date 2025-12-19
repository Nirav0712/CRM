import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

// GET handler to prevent build-time static generation issues
export async function GET() {
    return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

// PUT approve/reject attendance (admin only)
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { approvalStatus, note } = body;

        if (!approvalStatus || !["APPROVED", "REJECTED"].includes(approvalStatus)) {
            return NextResponse.json(
                { error: "Valid approvalStatus (APPROVED/REJECTED) is required" },
                { status: 400 }
            );
        }

        const attendance = await prisma.attendance.update({
            where: { id: params.id },
            data: {
                approvalStatus,
                approvedBy: session.user.name,
                approvedAt: new Date(),
                note: note || undefined,
                // If rejected, mark as absent
                status: approvalStatus === "REJECTED" ? "ABSENT" : undefined,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        return NextResponse.json(attendance);
    } catch (error) {
        console.error("Error updating attendance:", error);
        return NextResponse.json(
            { error: "Failed to update attendance" },
            { status: 500 }
        );
    }
}
