import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET tasks
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const date = searchParams.get("date");
        const month = searchParams.get("month"); // Format: YYYY-MM

        const where: any = {};

        // Staff can only see their own tasks
        if (session.user.role === "STAFF") {
            where.userId = session.user.id;
        } else if (userId) {
            where.userId = userId;
        }

        // Filter by specific date
        if (date) {
            const taskDate = new Date(date);
            taskDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(taskDate);
            nextDay.setDate(nextDay.getDate() + 1);

            where.date = {
                gte: taskDate,
                lt: nextDay,
            };
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

        const tasks = await prisma.task.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
                notes: {
                    include: {
                        user: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return NextResponse.json(
            { error: "Failed to fetch tasks" },
            { status: 500 }
        );
    }
}

// POST create task (staff logs work hours)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, date, hoursWorked, status = "IN_PROGRESS" } = body;

        if (!title || !date || hoursWorked === undefined) {
            return NextResponse.json(
                { error: "Title, date, and hoursWorked are required" },
                { status: 400 }
            );
        }

        const task = await prisma.task.create({
            data: {
                userId: session.user.id,
                title,
                description,
                date: new Date(date),
                hoursWorked: parseFloat(hoursWorked),
                status,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                notes: {
                    include: {
                        user: { select: { id: true, name: true } },
                    },
                },
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Error creating task:", error);
        return NextResponse.json(
            { error: "Failed to create task" },
            { status: 500 }
        );
    }
}
