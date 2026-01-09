import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

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

        if ((session.user as any).role !== "ADMIN") {
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

        const [leaveRows]: any = await db.execute("SELECT * FROM leave_requests WHERE id = ?", [params.id]);
        if (leaveRows.length === 0) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }
        const leaveData = leaveRows[0];

        const now = new Date();
        await db.execute(`
            UPDATE leave_requests 
            SET status = ?, approvedBy = ?, updatedAt = ?, reason = reason -- Placeholder to keep record
            WHERE id = ?
        `, [status, (session.user as any).id, now, params.id]);

        // Note: adminNote should be in schema.sql if we want to store it. 
        // For now I'll just use the existing fields or update schema if vital.
        // Let's assume schema.sql has what we need or we add it.
        // I'll update schema.sql to include adminNote if it's not there.

        // If leave is approved, create attendance records as ON_LEAVE
        if (status === "APPROVED") {
            const start = new Date(leaveData.startDate);
            const end = new Date(leaveData.endDate);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const leaveDate = new Date(d);
                const year = leaveDate.getFullYear();
                const month = String(leaveDate.getMonth() + 1).padStart(2, '0');
                const day = String(leaveDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                const attendanceId = `${leaveData.userId}_${dateStr}`;

                await db.execute(`
                    INSERT INTO attendance (id, userId, date, status, approvalStatus, updatedAt, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE status = VALUES(status), approvalStatus = VALUES(approvalStatus), updatedAt = VALUES(updatedAt)
                `, [
                    attendanceId,
                    leaveData.userId,
                    dateStr,
                    leaveData.leaveType === "HALF_DAY" ? "HALF_DAY" : "ON_LEAVE",
                    "APPROVED",
                    now,
                    now
                ]);
            }
        }

        return NextResponse.json({ id: params.id, ...leaveData, status, updatedAt: now });
    } catch (error: any) {
        console.error("Error updating leave request:", error);
        return NextResponse.json(
            { error: "Failed to update leave request", details: error.message },
            { status: 500 }
        );
    }
}

// PATCH update leave request (owner only, pending only)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [leaveRows]: any = await db.execute("SELECT * FROM leave_requests WHERE id = ?", [params.id]);
        if (leaveRows.length === 0) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }
        const leaveData = leaveRows[0];

        // Only owner can update
        if (leaveData.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Can only update pending requests
        if (leaveData.status !== "PENDING") {
            return NextResponse.json(
                { error: "Can only update pending leave requests" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { startDate, endDate, leaveType, reason } = body;

        const now = new Date();
        await db.execute(`
            UPDATE leave_requests 
            SET startDate = ?, endDate = ?, leaveType = ?, reason = ?, updatedAt = ?
            WHERE id = ?
        `, [
            startDate ? new Date(startDate) : leaveData.startDate,
            endDate ? new Date(endDate) : leaveData.endDate,
            leaveType || leaveData.leaveType,
            reason || leaveData.reason,
            now,
            params.id
        ]);

        return NextResponse.json({ id: params.id, ...leaveData, status: "PENDING", updatedAt: now });
    } catch (error: any) {
        console.error("Error updating leave request:", error);
        return NextResponse.json(
            { error: "Failed to update leave request", details: error.message },
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

        const [leaveRows]: any = await db.execute("SELECT * FROM leave_requests WHERE id = ?", [params.id]);
        if (leaveRows.length === 0) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }
        const leaveData = leaveRows[0];

        // Only owner or admin can delete
        if ((session.user as any).role !== "ADMIN" && leaveData.userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Can only delete pending requests
        if (leaveData.status !== "PENDING") {
            return NextResponse.json(
                { error: "Can only delete pending leave requests" },
                { status: 400 }
            );
        }

        await db.execute("DELETE FROM leave_requests WHERE id = ?", [params.id]);

        return NextResponse.json({ message: "Leave request deleted" });
    } catch (error: any) {
        console.error("Error deleting leave request:", error);
        return NextResponse.json(
            { error: "Failed to delete leave request", details: error.message },
            { status: 500 }
        );
    }
}
