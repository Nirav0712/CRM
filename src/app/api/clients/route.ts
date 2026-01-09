import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// Service types for clients
const SERVICE_TYPES = [
    "Web Development",
    "App Development",
    "UI/UX Design",
    "Digital Marketing",
    "SEO Services",
    "Content Writing",
    "Social Media Management",
    "Consultation",
    "Maintenance & Support",
    "Other"
];

// GET all clients
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const serviceType = searchParams.get("serviceType");

        let sql = "SELECT * FROM clients WHERE 1=1";
        const params: any[] = [];

        if (serviceType) {
            sql += " AND serviceType = ?";
            params.push(serviceType);
        }

        sql += " ORDER BY name ASC";

        const [rows]: any = await db.execute(sql, params);

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error("Error fetching clients:", error);
        return NextResponse.json(
            { error: "Failed to fetch clients", details: error.message },
            { status: 500 }
        );
    }
}

// POST create client (Admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins can create clients
        if ((session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const body = await request.json();
        const { name, email, phone, serviceType, address, notes } = body;

        if (!name || !serviceType) {
            return NextResponse.json(
                { error: "Name and service type are required" },
                { status: 400 }
            );
        }

        const id = generateId();
        const now = new Date();
        const userId = (session.user as any).id;

        await db.execute(`
            INSERT INTO clients (id, name, email, phone, serviceType, address, notes, createdBy, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, name, email || "", phone || "", serviceType, address || "", notes || "", userId, now, now]);

        return NextResponse.json(
            { id, name, email, phone, serviceType, address, notes, createdBy: userId, createdAt: now, updatedAt: now },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error creating client:", error);
        return NextResponse.json(
            { error: "Failed to create client", details: error.message },
            { status: 500 }
        );
    }
}
