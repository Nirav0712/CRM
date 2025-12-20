export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

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

        if ((session.user as any).role !== "ADMIN") {
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

        const attendanceRef = db.collection("attendance").doc(params.id);
        const attendanceDoc = await attendanceRef.get();

        if (!attendanceDoc.exists) {
            return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
        }

        const existingData = attendanceDoc.data()!;

        const updateData: any = {
            approvalStatus,
            approvedBy: session.user.name,
            approvedAt: new Date(),
            updatedAt: new Date()
        };
        if (note) updateData.note = note;
        if (approvalStatus === "REJECTED") updateData.status = "ABSENT";

        await attendanceRef.update(updateData);

        // Fetch user for response
        let user = null;
        if (existingData.userId) {
            const userDoc = await db.collection("users").doc(existingData.userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                user = { id: userDoc.id, name: userData?.name, email: userData?.email };
            }
        }

        return NextResponse.json({
            id: params.id,
            ...existingData,
            ...updateData,
            date: existingData.date?.toDate(),
            user
        });
    } catch (error) {
        console.error("Error updating attendance:", error);
        return NextResponse.json(
            { error: "Failed to update attendance" },
            { status: 500 }
        );
    }
}
