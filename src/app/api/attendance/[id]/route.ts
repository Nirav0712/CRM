import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

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

        const [attendanceRows]: any = await db.execute("SELECT * FROM attendance WHERE id = ?", [params.id]);
        if (attendanceRows.length === 0) {
            return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
        }
        const existingData = attendanceRows[0];

        const now = new Date();
        const updateFields = ["approvalStatus = ?", "updatedAt = ?"];
        const updateParams = [approvalStatus, now];

        if (note) {
            updateFields.push("note = ?");
            updateParams.push(note);
        }
        if (approvalStatus === "REJECTED") {
            updateFields.push("status = 'ABSENT'");
        }

        updateParams.push(params.id);

        await db.execute(`
            UPDATE attendance 
            SET ${updateFields.join(", ")}
            WHERE id = ?
        `, updateParams);

        return NextResponse.json({
            id: params.id,
            ...existingData,
            approvalStatus,
            note: note || existingData.note,
            updatedAt: now
        });
    } catch (error: any) {
        console.error("Error updating attendance:", error);
        return NextResponse.json(
            { error: "Failed to update attendance", details: error.message },
            { status: 500 }
        );
    }
}
