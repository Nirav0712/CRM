import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT approve/reject leave request (admin only)
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
        const { status, adminNote } = body;

        if (!status || !["APPROVED", "REJECTED"].includes(status)) {
            return NextResponse.json(
                { error: "Valid status (APPROVED/REJECTED) is required" },
                { status: 400 }
            );
        }

        const leaveRequest = await prisma.leaveRequest.update({
            where: { id: params.id },
            data: {
                status,
                approvedBy: session.user.name,
                approvedAt: new Date(),
                adminNote,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        // If leave is approved, create attendance records as ON_LEAVE
        if (status === "APPROVED") {
            const start = new Date(leaveRequest.startDate);
            const end = new Date(leaveRequest.endDate);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const leaveDate = new Date(d);
                leaveDate.setHours(0, 0, 0, 0);

                await prisma.attendance.upsert({
                    where: {
                        userId_date: {
                            userId: leaveRequest.userId,
                            date: leaveDate,
                        },
                    },
                    update: {
                        status: leaveRequest.leaveType === "HALF_DAY" ? "HALF_DAY" : "ON_LEAVE",
                        approvalStatus: "APPROVED",
                        approvedBy: session.user.name,
                        approvedAt: new Date(),
                    },
                    create: {
                        userId: leaveRequest.userId,
                        date: leaveDate,
                        status: leaveRequest.leaveType === "HALF_DAY" ? "HALF_DAY" : "ON_LEAVE",
                        approvalStatus: "APPROVED",
                        approvedBy: session.user.name,
                        approvedAt: new Date(),
                    },
                });
            }
        }

        return NextResponse.json(leaveRequest);
    } catch (error) {
        console.error("Error updating leave request:", error);
        return NextResponse.json(
            { error: "Failed to update leave request" },
            { status: 500 }
        );
    }
}

// DELETE leave request (only pending, by owner or admin)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: params.id },
        });

        if (!leaveRequest) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        // Only owner or admin can delete
        if (session.user.role !== "ADMIN" && leaveRequest.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Can only delete pending requests
        if (leaveRequest.status !== "PENDING") {
            return NextResponse.json(
                { error: "Can only delete pending leave requests" },
                { status: 400 }
            );
        }

        await prisma.leaveRequest.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Leave request deleted" });
    } catch (error) {
        console.error("Error deleting leave request:", error);
        return NextResponse.json(
            { error: "Failed to delete leave request" },
            { status: 500 }
        );
    }
}
