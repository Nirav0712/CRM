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

        const [officeIpDoc, locationTrackingDoc, ipRestrictionDoc] = await Promise.all([
            db.collection("systemSettings").doc("office_ip").get(),
            db.collection("systemSettings").doc("location_tracking").get(),
            db.collection("systemSettings").doc("ip_restriction").get(),
        ]);

        return NextResponse.json({
            office_ip: officeIpDoc.exists ? officeIpDoc.data()?.value : null,
            location_tracking_enabled: locationTrackingDoc.exists ? locationTrackingDoc.data()?.enabled : true,
            ip_restriction_enabled: ipRestrictionDoc.exists ? ipRestrictionDoc.data()?.enabled : true, // Default to true
        });
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
        const { office_ip, location_tracking_enabled, ip_restriction_enabled } = body;

        // Handle office IP setting
        if (office_ip !== undefined) {
            let ipToSave = office_ip;

            if (office_ip === "CURRENT") {
                const forwardedFor = request.headers.get("x-forwarded-for");
                ipToSave = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
                if (ipToSave === "::1") ipToSave = "127.0.0.1";
            }

            await db.collection("systemSettings").doc("office_ip").set({
                key: "office_ip",
                value: ipToSave,
                updatedAt: new Date()
            });
        }

        // Handle location tracking setting
        if (location_tracking_enabled !== undefined) {
            await db.collection("systemSettings").doc("location_tracking").set({
                key: "location_tracking",
                enabled: location_tracking_enabled,
                updatedAt: new Date()
            });
        }

        // Handle IP restriction setting
        if (ip_restriction_enabled !== undefined) {
            await db.collection("systemSettings").doc("ip_restriction").set({
                key: "ip_restriction",
                enabled: ip_restriction_enabled,
                updatedAt: new Date()
            });
        }

        // Fetch updated values to return
        const [officeIpDoc, locationTrackingDoc, ipRestrictionDoc] = await Promise.all([
            db.collection("systemSettings").doc("office_ip").get(),
            db.collection("systemSettings").doc("location_tracking").get(),
            db.collection("systemSettings").doc("ip_restriction").get(),
        ]);

        return NextResponse.json({
            success: true,
            office_ip: officeIpDoc.exists ? officeIpDoc.data()?.value : null,
            location_tracking_enabled: locationTrackingDoc.exists ? locationTrackingDoc.data()?.enabled : true,
            ip_restriction_enabled: ipRestrictionDoc.exists ? ipRestrictionDoc.data()?.enabled : true,
        });
    } catch (error) {
        console.error("Failed to save settings:", error);
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
}
