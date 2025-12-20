import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const settingsSnapshot = await db.collection("systemSettings")
            .doc("office_ip")
            .get();

        return NextResponse.json({ office_ip: settingsSnapshot.exists ? settingsSnapshot.data()?.value : null });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { office_ip } = body;

        // If office_ip is "CURRENT", we detect it from request
        let ipToSave = office_ip;

        if (office_ip === "CURRENT") {
            const forwardedFor = request.headers.get("x-forwarded-for");
            ipToSave = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
            // On localhost it is often ::1, we might map to 127.0.0.1 for consistency or keep as is.
            if (ipToSave === "::1") ipToSave = "127.0.0.1";
        }

        await db.collection("systemSettings").doc("office_ip").set({
            key: "office_ip",
            value: ipToSave,
            updatedAt: new Date()
        });

        return NextResponse.json({ success: true, office_ip: ipToSave });
    } catch (error) {
        console.error("Failed to save settings:", error);
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
}
