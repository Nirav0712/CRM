import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET attendance records
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const month = searchParams.get("month"); // Format: YYYY-MM
        const status = searchParams.get("status");

        const where: any = {};

        // Staff can only see their own attendance
        if (session.user.role === "STAFF") {
            where.userId = session.user.id;
        } else if (userId) {
            where.userId = userId;
        }

        // Filter by month
        if (month) {
            const [year, monthNum] = month.split("-").map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59);
            where.date = {
                gte: startDate,
                lte: endDate,
            };
        }

        // Filter by approval status
        if (status) {
            where.approvalStatus = status;
        }

        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { date: "desc" },
        });

        return NextResponse.json(attendance);
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance" },
            { status: 500 }
        );
    }
}

// POST mark attendance
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // IP Restriction Check
        if (session.user.role === "STAFF") { // Only restrict staff? Or everyone? Usually staff.
            const settings = await prisma.systemSettings.findUnique({
                where: { key: "office_ip" },
            });

            if (settings?.value) {
                const forwardedFor = request.headers.get("x-forwarded-for");
                let clientIp = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
                if (clientIp === "::1") clientIp = "127.0.0.1";

                if (clientIp !== settings.value) {
                    return NextResponse.json({
                        error: `Attendance can only be marked from the office network (Allowed: ${settings.value}, Your IP: ${clientIp})`
                    }, { status: 403 });
                }
            }
        }

        const body = await request.json();
        const { date, status = "PRESENT", checkIn, checkOut, note } = body;

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        // Parse date to start of day
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Check if attendance already exists for this date
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: attendanceDate,
                },
            },
        });

        if (existing) {
            // Update existing attendance
            const updated = await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    status,
                    checkIn: checkIn ? new Date(checkIn) : undefined,
                    checkOut: checkOut ? new Date(checkOut) : undefined,
                    note,
                    approvalStatus: "PENDING", // Reset to pending on update
                },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
            });
            return NextResponse.json(updated);
        }

        // Create new attendance record
        const attendance = await prisma.attendance.create({
            data: {
                userId: session.user.id,
                date: attendanceDate,
                status,
                checkIn: checkIn ? new Date(checkIn) : null,
                checkOut: checkOut ? new Date(checkOut) : null,
                note,
                approvalStatus: "PENDING",
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        return NextResponse.json(attendance, { status: 201 });
    } catch (error) {
        console.error("Error marking attendance:", error);
        return NextResponse.json(
            { error: "Failed to mark attendance" },
            { status: 500 }
        );
    }
}
