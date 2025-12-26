import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

// Service types for clients
export const SERVICE_TYPES = [
    "Web Development",
    "App Development",
    "UI/UX Design",
    "Digital Marketing",
    "SEO Services",
    "Content Writing",
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

        const snapshot = await db.collection("clients").get();

        let clients = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            };
        });

        // Filter by service type if provided
        if (serviceType) {
            clients = clients.filter((c: any) => c.serviceType === serviceType);
        }

        // Sort by name
        clients.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));

        return NextResponse.json(clients);
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

        const now = new Date();
        const clientData = {
            name,
            email: email || "",
            phone: phone || "",
            serviceType,
            address: address || "",
            notes: notes || "",
            createdAt: now,
            updatedAt: now,
            createdBy: (session.user as any).id,
        };

        const docRef = await db.collection("clients").add(clientData);

        return NextResponse.json(
            { id: docRef.id, ...clientData },
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
