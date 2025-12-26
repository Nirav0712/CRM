export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";

// GET single client
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientDoc = await db.collection("clients").doc(params.id).get();

        if (!clientDoc.exists) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        const data = clientDoc.data()!;
        return NextResponse.json({
            id: clientDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        });
    } catch (error: any) {
        console.error("Error fetching client:", error);
        return NextResponse.json(
            { error: "Failed to fetch client", details: error.message },
            { status: 500 }
        );
    }
}

// PUT update client (Admin only)
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
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const clientRef = db.collection("clients").doc(params.id);
        const clientDoc = await clientRef.get();

        if (!clientDoc.exists) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        const body = await request.json();
        const { name, email, phone, serviceType, address, notes } = body;

        const updateData: any = {
            updatedAt: new Date()
        };

        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (serviceType !== undefined) updateData.serviceType = serviceType;
        if (address !== undefined) updateData.address = address;
        if (notes !== undefined) updateData.notes = notes;

        await clientRef.update(updateData);

        const updatedDoc = await clientRef.get();
        const data = updatedDoc.data()!;

        return NextResponse.json({
            id: params.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        });
    } catch (error: any) {
        console.error("Error updating client:", error);
        return NextResponse.json(
            { error: "Failed to update client", details: error.message },
            { status: 500 }
        );
    }
}

// DELETE client (Admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if ((session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const clientRef = db.collection("clients").doc(params.id);
        const clientDoc = await clientRef.get();

        if (!clientDoc.exists) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        await clientRef.delete();

        return NextResponse.json({ message: "Client deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting client:", error);
        return NextResponse.json(
            { error: "Failed to delete client", details: error.message },
            { status: 500 }
        );
    }
}
