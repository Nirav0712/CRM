import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET attendance records
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userIdFilter = searchParams.get("userId");
        const month = searchParams.get("month"); // Format: YYYY-MM
        const statusFilter = searchParams.get("status");
        const isAdmin = (session.user as any).role === "ADMIN";

        let sql = `
            SELECT a.*, u.name as userName, u.email as userEmail
            FROM attendance a
            LEFT JOIN users u ON a.userId = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Staff can only see their own attendance
        if ((session.user as any).role === "STAFF") {
            sql += " AND a.userId = ?";
            params.push((session.user as any).id);
        } else if (userIdFilter) {
            sql += " AND a.userId = ?";
            params.push(userIdFilter);
        }

        if (month) {
            const [year, monthNum] = month.split("-");
            sql += " AND YEAR(a.date) = ? AND MONTH(a.date) = ?";
            params.push(year, monthNum);
        }

        if (statusFilter) {
            sql += " AND a.approvalStatus = ?";
            params.push(statusFilter);
        }

        sql += " ORDER BY a.date DESC";

        const [rows]: any = await db.execute(sql, params);

        const attendance = rows.map((record: any) => {
            const r = {
                ...record,
                location: record.location ? (typeof record.location === 'string' ? JSON.parse(record.location) : record.location) : null,
                user: { id: record.userId, name: record.userName || "Unknown", email: record.userEmail || "" }
            };
            // Filter sensitive location data for staff users
            if (!isAdmin) {
                delete r.ipAddress;
                delete r.location;
            }
            return r;
        });

        return NextResponse.json(attendance);
    } catch (error: any) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json(
            { error: "Failed to fetch attendance", details: error.message },
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

        // Extract IP address from request headers
        const forwardedFor = request.headers.get("x-forwarded-for");
        const realIp = request.headers.get("x-real-ip");
        let clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : (realIp || "127.0.0.1");

        // Normalize IPs for local testing
        const normalizeIp = (ip: string) => (ip === "::1" || ip === "::ffff:127.0.0.1") ? "127.0.0.1" : ip.trim();
        clientIp = normalizeIp(clientIp);

        // IP Restriction Check (only if enabled)
        if ((session.user as any).role === "STAFF") {
            const [restrictionRows]: any = await db.execute("SELECT `value` FROM settings WHERE `key` = 'ip_restriction' LIMIT 1");
            const ipRestrictionEnabled = restrictionRows.length > 0 ? JSON.parse(restrictionRows[0].value) : true;

            if (ipRestrictionEnabled) {
                const [officeIpRows]: any = await db.execute("SELECT `value` FROM settings WHERE `key` = 'office_ip' LIMIT 1");
                if (officeIpRows.length > 0) {
                    const allowedIp = normalizeIp(JSON.parse(officeIpRows[0].value));
                    if (clientIp !== allowedIp) {
                        return NextResponse.json({
                            error: `Attendance can only be marked from the office network (Allowed: ${allowedIp}, Your IP: ${clientIp})`
                        }, { status: 403 });
                    }
                }
            }
        }

        const body = await request.json();
        const { date, status = "PRESENT", checkIn, checkOut, note, location } = body;

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const id = `${userId}_${date}`;
        const now = new Date();

        await db.execute(`
            INSERT INTO attendance (id, userId, date, status, checkIn, checkOut, note, approvalStatus, ipAddress, location, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status), 
                checkIn = COALESCE(VALUES(checkIn), checkIn), 
                checkOut = COALESCE(VALUES(checkOut), checkOut), 
                note = VALUES(note), 
                ipAddress = VALUES(ipAddress), 
                location = VALUES(location), 
                updatedAt = VALUES(updatedAt)
        `, [
            id, userId, date, status,
            checkIn ? new Date(checkIn).toTimeString().split(' ')[0] : null,
            checkOut ? new Date(checkOut).toTimeString().split(' ')[0] : null,
            note || null, "PENDING", clientIp, location ? JSON.stringify(location) : null, now, now
        ]);

        return NextResponse.json({
            id, userId, date, status, checkIn, checkOut, note, approvalStatus: "PENDING", updatedAt: now,
            user: { id: userId, name: session.user.name, email: session.user.email }
        });
    } catch (error: any) {
        console.error("Error marking attendance:", error);
        return NextResponse.json(
            { error: "Failed to mark attendance", details: error.message },
            { status: 500 }
        );
    }
}
