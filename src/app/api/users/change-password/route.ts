import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: "Current password and new password are required" },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "New password must be at least 6 characters long" },
                { status: 400 }
            );
        }

        const userId = (session.user as any).id;
        const [rows]: any = await db.execute("SELECT password FROM users WHERE id = ?", [userId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = rows[0];

        // Check current password
        const isPasswordValid = await bcrypt.compare(currentPassword, userData.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update user
        const now = new Date();
        await db.execute("UPDATE users SET password = ?, updatedAt = ? WHERE id = ?", [hashedNewPassword, now, userId]);

        return NextResponse.json({ message: "Password updated successfully" });
    } catch (error: any) {
        console.error("Error changing password:", error);
        return NextResponse.json(
            { error: "Failed to change password", details: error.message },
            { status: 500 }
        );
    }
}
