import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

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

        const [rows]: any = await db.execute("SELECT * FROM clients WHERE id = ?", [params.id]);

        if (rows.length === 0) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
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

        const [rows]: any = await db.execute("SELECT id FROM clients WHERE id = ?", [params.id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        const body = await request.json();
        const { name, email, phone, serviceType, address, notes } = body;

        const updateFields: string[] = ["updatedAt = ?"];
        const updateParams: any[] = [new Date()];

        if (name !== undefined) { updateFields.push("name = ?"); updateParams.push(name); }
        if (email !== undefined) { updateFields.push("email = ?"); updateParams.push(email); }
        if (phone !== undefined) { updateFields.push("phone = ?"); updateParams.push(phone); }
        if (serviceType !== undefined) { updateFields.push("serviceType = ?"); updateParams.push(serviceType); }
        if (address !== undefined) { updateFields.push("address = ?"); updateParams.push(address); }
        if (notes !== undefined) { updateFields.push("notes = ?"); updateParams.push(notes); }

        updateParams.push(params.id);

        await db.execute(`
            UPDATE clients 
            SET ${updateFields.join(", ")}
            WHERE id = ?
        `, updateParams);

        const [updatedRows]: any = await db.execute("SELECT * FROM clients WHERE id = ?", [params.id]);
        return NextResponse.json(updatedRows[0]);
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

        const [rows]: any = await db.execute("SELECT id FROM clients WHERE id = ?", [params.id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        await db.execute("DELETE FROM clients WHERE id = ?", [params.id]);

        return NextResponse.json({ message: "Client deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting client:", error);
        return NextResponse.json(
            { error: "Failed to delete client", details: error.message },
            { status: 500 }
        );
    }
}
