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

        // We Fetch all records for the user and filter in-memory to be ROBUST against index issues
        const snapshot = await query.get();
        let attendance = await Promise.all(snapshot.docs.map(async (doc: any) => {
            const data = doc.data();
            let user = null;
            if (data.userId) {
                const userDoc = await db.collection("users").doc(data.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    user = { id: userDoc.id, name: userData?.name || "Unknown", email: userData?.email || "" };
                }
            }
            if (!user) user = { id: data.userId || "deleted", name: "Deleted User", email: "" };

            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate(),
                checkIn: data.checkIn?.toDate(),
                checkOut: data.checkOut?.toDate(),
                user
            };
        }));

        // In-memory Filter by month
        if (month) {
            attendance = attendance.filter(record => {
                if (!record.date) return false;
                const d = new Date(record.date);
                const year = d.getFullYear();
                const monthNum = String(d.getMonth() + 1).padStart(2, '0');
                return `${year}-${monthNum}` === month;
            });
        }

        // In-memory Filter by approval status
        if (status) {
            attendance = attendance.filter(record => record.approvalStatus === status);
        }

        // Sort in-memory to be ROBUST against index requirements
        attendance.sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date.getTime() : 0;
            const dateB = b.date instanceof Date ? b.date.getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json(attendance);
    } catch (error: any) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance", details: error.message },
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
            const settingsDoc = await db.collection("systemSettings")
                .doc("office_ip")
                .get();

            if (settingsDoc.exists) {
                const settings = settingsDoc.data();
                if (settings && settings.value) {
                    const forwardedFor = request.headers.get("x-forwarded-for");
                    let clientIp = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";

                    // Normalize IPs for local testing (mapping IPv6 loopback to IPv4)
                    const normalizeIp = (ip: string) => (ip === "::1" || ip === "::ffff:127.0.0.1") ? "127.0.0.1" : ip.trim();
                    const normalizedClient = normalizeIp(clientIp);
                    const normalizedAllowed = normalizeIp(settings.value);

                    if (normalizedClient !== normalizedAllowed) {
                        return NextResponse.json({
                            error: `Attendance can only be marked from the office network (Allowed: ${settings.value}, Your IP: ${clientIp})`
                        }, { status: 403 });
                    }
                }
            }
        }

        const body = await request.json();
        const { date, status = "PRESENT", checkIn, checkOut, note } = body;

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        // Parse date reliably: YYYY-MM-DD
        const [year, month, day] = date.split('-').map(Number);
        const attendanceDate = new Date(year, month - 1, day);
        attendanceDate.setHours(0, 0, 0, 0);

        // Use a composite ID for uniqueness: userId_YYYY-MM-DD
        // We use the raw date string from the client to avoid any timezone shifting
        const docId = `${(session.user as any).id}_${date}`;
        const attendanceRef = db.collection("attendance").doc(docId);
        const doc = await attendanceRef.get();
        const existingData = doc.exists ? doc.data() : null;

        // Ensure we handle Firestore Timestamps correctly
        const getAsDate = (val: any) => {
            if (!val) return null;
            if (val instanceof Date) return val;
            if (typeof val.toDate === 'function') return val.toDate();
            return new Date(val);
        };

        const data: any = {
            userId: (session.user as any).id,
            date: attendanceDate,
            status,
            checkIn: checkIn ? new Date(checkIn) : getAsDate(existingData?.checkIn),
            checkOut: checkOut ? new Date(checkOut) : getAsDate(existingData?.checkOut),
            note: note !== undefined ? note : (existingData?.note || null),
            approvalStatus: "PENDING", // Always PENDING for admin review
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
            checkIn: data.checkIn instanceof Date ? data.checkIn.toISOString() : null,
            checkOut: data.checkOut instanceof Date ? data.checkOut.toISOString() : null,
            user: { id: (session.user as any).id, name: session.user.name, email: session.user.email }
        };

        return NextResponse.json(result, { status: doc.exists ? 200 : 210 });
    } catch (error: any) {
        console.error("Error marking attendance:", error);
        return NextResponse.json(
            { error: "Failed to mark attendance", details: error.message },
            { status: 500 }
        );
    }
}
