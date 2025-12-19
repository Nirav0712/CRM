import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const setting = await prisma.systemSettings.findUnique({
            where: { key: "office_ip" },
        });

        return NextResponse.json({ office_ip: setting?.value || null });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "ADMIN") {
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

        await prisma.systemSettings.upsert({
            where: { key: "office_ip" },
            update: { value: ipToSave },
            create: { key: "office_ip", value: ipToSave },
        });

        return NextResponse.json({ success: true, office_ip: ipToSave });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
}
