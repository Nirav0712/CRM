import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [rows]: any = await db.execute("SELECT `key`, `value` FROM settings");
        const settings: any = {};
        rows.forEach((row: any) => {
            settings[row.key] = row.value;
        });

        return NextResponse.json({
            office_ip: settings.office_ip || null,
            location_tracking_enabled: settings.location_tracking !== undefined ? settings.location_tracking : true,
            ip_restriction_enabled: settings.ip_restriction !== undefined ? settings.ip_restriction : true,
        });
    } catch (error) {
        console.error("Error fetching settings:", error);
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

        const now = new Date();

        // Helper to update setting
        const updateSetting = async (key: string, value: any) => {
            await db.execute(`
                INSERT INTO settings (id, \`key\`, \`value\`, updatedAt)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updatedAt = VALUES(updatedAt)
            `, [key, key, JSON.stringify(value), now]);
        };

        // Handle office IP setting
        if (office_ip !== undefined) {
            let ipToSave = office_ip;

            if (office_ip === "CURRENT") {
                const forwardedFor = request.headers.get("x-forwarded-for");
                ipToSave = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
                if (ipToSave === "::1") ipToSave = "127.0.0.1";
            }
            await updateSetting("office_ip", ipToSave);
        }

        // Handle location tracking setting
        if (location_tracking_enabled !== undefined) {
            await updateSetting("location_tracking", location_tracking_enabled);
        }

        // Handle IP restriction setting
        if (ip_restriction_enabled !== undefined) {
            await updateSetting("ip_restriction", ip_restriction_enabled);
        }

        // Fetch updated values
        const [rows]: any = await db.execute("SELECT `key`, `value` FROM settings");
        const settings: any = {};
        rows.forEach((row: any) => {
            settings[row.key] = row.value;
        });

        return NextResponse.json({
            success: true,
            office_ip: settings.office_ip || null,
            location_tracking_enabled: settings.location_tracking !== undefined ? settings.location_tracking : true,
            ip_restriction_enabled: settings.ip_restriction !== undefined ? settings.ip_restriction : true,
        });
    } catch (error) {
        console.error("Failed to save settings:", error);
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
}
