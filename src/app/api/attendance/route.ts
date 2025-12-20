import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

// GET attendance records
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const month = searchParams.get("month"); // Format: YYYY-MM
        const status = searchParams.get("status");

        let query: any = db.collection("attendance");

        // Staff can only see their own attendance
        if ((session.user as any).role === "STAFF") {
            query = query.where("userId", "==", (session.user as any).id);
        } else if (userId) {
            query = query.where("userId", "==", userId);
        }

        // Filter by month
        if (month) {
            const [year, monthNum] = month.split("-").map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59);
            query = query.where("date", ">=", startDate).where("date", "<=", endDate);
        }

        // Filter by approval status
        if (status) {
            query = query.where("approvalStatus", "==", status);
        }

        const snapshot = await query.orderBy("date", "desc").get();
        const attendance = await Promise.all(snapshot.docs.map(async (doc: any) => {
            const data = doc.data();
            let user = null;
            if (data.userId) {
                const userDoc = await db.collection("users").doc(data.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    user = { id: userDoc.id, name: userData?.name, email: userData?.email };
                }
            }
            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate(),
                checkIn: data.checkIn?.toDate(),
                checkOut: data.checkOut?.toDate(),
                user
            };
        }));

        return NextResponse.json(attendance);
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance" },
            { status: 500 }
        );
    }
}

// POST mark attendance
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // IP Restriction Check
        if ((session.user as any).role === "STAFF") {
            const settingsSnapshot = await db.collection("systemSettings")
                .where("key", "==", "office_ip")
                .limit(1)
                .get();

            if (!settingsSnapshot.empty) {
                const settings = settingsSnapshot.docs[0].data();
                const forwardedFor = request.headers.get("x-forwarded-for");
                let clientIp = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
                if (clientIp === "::1") clientIp = "127.0.0.1";

                if (clientIp !== settings.value) {
                    return NextResponse.json({
                        error: `Attendance can only be marked from the office network (Allowed: ${settings.value}, Your IP: ${clientIp})`
                    }, { status: 403 });
                }
            }
        }

        const body = await request.json();
        const { date, status = "PRESENT", checkIn, checkOut, note } = body;

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        // Parse date to start of day
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Use a composite ID for uniqueness: userId_YYYY-MM-DD
        const dateStr = attendanceDate.toISOString().split('T')[0];
        const docId = `${(session.user as any).id}_${dateStr}`;
        const attendanceRef = db.collection("attendance").doc(docId);
        const doc = await attendanceRef.get();

        const data: any = {
            userId: (session.user as any).id,
            date: attendanceDate,
            status,
            checkIn: checkIn ? new Date(checkIn) : (doc.exists ? doc.data()?.checkIn : null),
            checkOut: checkOut ? new Date(checkOut) : (doc.exists ? doc.data()?.checkOut : null),
            note: note !== undefined ? note : (doc.exists ? doc.data()?.note : null),
            approvalStatus: "PENDING",
            updatedAt: new Date(),
        };

        if (!doc.exists) {
            data.createdAt = new Date();
            await attendanceRef.set(data);
        } else {
            await attendanceRef.update(data);
        }

        const result = {
            id: docId,
            ...data,
            date: data.date.toISOString(),
            // Need to fetch user details for response to match original behavior
        };

        return NextResponse.json(result, { status: doc.exists ? 200 : 210 });
    } catch (error) {
        console.error("Error marking attendance:", error);
        return NextResponse.json(
            { error: "Failed to mark attendance" },
            { status: 500 }
        );
    }
}
