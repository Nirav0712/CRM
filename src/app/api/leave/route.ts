import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

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

        let query: any = db.collection("leaveRequests");

        // Staff can only see their own leave requests
        if ((session.user as any).role === "STAFF") {
            query = query.where("userId", "==", (session.user as any).id);
        }

        if (status) {
            query = query.where("status", "==", status);
        }

        const snapshot = await query.orderBy("createdAt", "desc").get();
        const leaveRequests = await Promise.all(snapshot.docs.map(async (doc: any) => {
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
                startDate: data.startDate?.toDate(),
                endDate: data.endDate?.toDate(),
                createdAt: data.createdAt?.toDate(),
                user
            };
        }));

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

        const now = new Date();
        const leaveData = {
            userId: (session.user as any).id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            leaveType,
            reason,
            status: "PENDING",
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection("leaveRequests").add(leaveData);

        return NextResponse.json({ id: docRef.id, ...leaveData }, { status: 201 });
    } catch (error) {
        console.error("Error creating leave request:", error);
        return NextResponse.json(
            { error: "Failed to create leave request" },
            { status: 500 }
        );
    }
}
