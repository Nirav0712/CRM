export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

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

        const leaveRef = db.collection("leaveRequests").doc(params.id);
        const leaveDoc = await leaveRef.get();

        if (!leaveDoc.exists) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        const leaveData = leaveDoc.data()!;

        const updateData: any = {
            status,
            approvedBy: session.user.name,
            approvedAt: new Date(),
            adminNote: adminNote || "",
            updatedAt: new Date()
        };

        await leaveRef.update(updateData);

        // If leave is approved, create attendance records as ON_LEAVE
        if (status === "APPROVED") {
            const start = leaveData.startDate.toDate();
            const end = leaveData.endDate.toDate();

            const batch = db.batch();
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const leaveDate = new Date(d);
                leaveDate.setHours(0, 0, 0, 0);

                // Use robust date string matching our fixed attendance API
                const year = leaveDate.getFullYear();
                const month = String(leaveDate.getMonth() + 1).padStart(2, '0');
                const day = String(leaveDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const attendanceId = `${leaveData.userId}_${dateStr}`;
                const attendanceRef = db.collection("attendance").doc(attendanceId);

                batch.set(attendanceRef, {
                    userId: leaveData.userId,
                    date: leaveDate,
                    status: leaveData.leaveType === "HALF_DAY" ? "HALF_DAY" : "ON_LEAVE",
                    approvalStatus: "APPROVED",
                    approvedBy: session.user.name,
                    approvedAt: new Date(),
                    updatedAt: new Date()
                }, { merge: true });
            }
            await batch.commit();
        }

        // Fetch user for response
        let user = null;
        const userDoc = await db.collection("users").doc(leaveData.userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            user = { id: userDoc.id, name: userData?.name, email: userData?.email };
        }

        return NextResponse.json({
            id: params.id,
            ...leaveData,
            ...updateData,
            startDate: leaveData.startDate.toDate(),
            endDate: leaveData.endDate.toDate(),
            user
        });
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

        const leaveRef = db.collection("leaveRequests").doc(params.id);
        const leaveDoc = await leaveRef.get();

        if (!leaveDoc.exists) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        const leaveData = leaveDoc.data()!;

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

        await leaveRef.delete();

        return NextResponse.json({ message: "Leave request deleted" });
    } catch (error) {
        console.error("Error deleting leave request:", error);
        return NextResponse.json(
            { error: "Failed to delete leave request" },
            { status: 500 }
        );
    }
}
