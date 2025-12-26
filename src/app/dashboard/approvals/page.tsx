"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
    Check,
    X,
    Loader2,
    Calendar,
    Clock,
} from "lucide-react";

interface Attendance {
    id: string;
    date: string;
    status: string;
    approvalStatus: string;
    checkIn: string | null;
    checkOut: string | null;
    note: string | null;
    user: { id: string; name: string; email: string };
    createdAt: string;
}

interface LeaveRequest {
    id: string;
    startDate: string;
    endDate: string;
    leaveType: string;
    reason: string | null;
    status: string;
    user: { id: string; name: string; email: string };
    createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800",
    HALF_DAY: "bg-yellow-100 text-yellow-800",
    ABSENT: "bg-red-100 text-red-800",
    ON_LEAVE: "bg-blue-100 text-blue-800",
    PENDING: "bg-gray-100 text-gray-800",
};

export default function ApprovalsPage() {
    const { data: session } = useSession();
    const [attendanceRequests, setAttendanceRequests] = useState<Attendance[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"attendance" | "leave">("attendance");

    // Redirect non-admin users
    if (session?.user?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [attendanceRes, leaveRes] = await Promise.all([
                fetch("/api/attendance?status=PENDING"),
                fetch("/api/leave?status=PENDING"),
            ]);
            if (attendanceRes.ok) {
                setAttendanceRequests(await attendanceRes.json());
            }
            if (leaveRes.ok) {
                setLeaveRequests(await leaveRes.json());
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceApproval = async (id: string, approvalStatus: "APPROVED" | "REJECTED") => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/attendance/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approvalStatus }),
            });

            if (res.ok) {
                setAttendanceRequests(attendanceRequests.filter((a) => a.id !== id));
            } else {
                const error = await res.json();
                alert(error.error || "Failed to process");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleLeaveApproval = async (id: string, status: "APPROVED" | "REJECTED") => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/leave/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                setLeaveRequests(leaveRequests.filter((l) => l.id !== id));
            } else {
                const error = await res.json();
                alert(error.error || "Failed to process");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const pendingCount = attendanceRequests.length + leaveRequests.length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
                <p className="text-gray-500">
                    Review and approve attendance and leave requests
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("attendance")}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "attendance"
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Attendance
                    {attendanceRequests.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                            {attendanceRequests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("leave")}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "leave"
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Leave Requests
                    {leaveRequests.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                            {leaveRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="card p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                </div>
            ) : (
                <>
                    {/* Attendance Approvals */}
                    {activeTab === "attendance" && (
                        <div className="card overflow-hidden">
                            {attendanceRequests.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {attendanceRequests.map((record) => (
                                        <div key={record.id} className="p-4 hover:bg-gray-50">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                                        <span className="text-white font-medium text-sm">
                                                            {record.user.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {record.user.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDate(record.date)}
                                                            </div>
                                                            <span className={`badge ${STATUS_COLORS[record.status]}`}>
                                                                {record.status.replace("_", " ")}
                                                            </span>
                                                            {(record.checkIn || record.checkOut) && (
                                                                <div className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                                    <span>
                                                                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                        {" - "}
                                                                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {record.note && (
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                Note: {record.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleAttendanceApproval(record.id, "APPROVED")}
                                                        disabled={processingId === record.id}
                                                        className="btn-primary py-1.5 px-3 text-sm"
                                                    >
                                                        {processingId === record.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Check className="w-4 h-4 mr-1" />
                                                                Approve
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAttendanceApproval(record.id, "REJECTED")}
                                                        disabled={processingId === record.id}
                                                        className="btn-danger py-1.5 px-3 text-sm"
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                                    No pending attendance requests
                                </div>
                            )}
                        </div>
                    )}

                    {/* Leave Approvals */}
                    {activeTab === "leave" && (
                        <div className="card overflow-hidden">
                            {leaveRequests.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {leaveRequests.map((request) => (
                                        <div key={request.id} className="p-4 hover:bg-gray-50">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                                        <span className="text-white font-medium text-sm">
                                                            {request.user.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {request.user.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                                            <span className="badge bg-blue-100 text-blue-800">
                                                                {request.leaveType.replace("_", " ")}
                                                            </span>
                                                        </div>
                                                        {request.reason && (
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                Reason: {request.reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleLeaveApproval(request.id, "APPROVED")}
                                                        disabled={processingId === request.id}
                                                        className="btn-primary py-1.5 px-3 text-sm"
                                                    >
                                                        {processingId === request.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Check className="w-4 h-4 mr-1" />
                                                                Approve
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleLeaveApproval(request.id, "REJECTED")}
                                                        disabled={processingId === request.id}
                                                        className="btn-danger py-1.5 px-3 text-sm"
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                                    No pending leave requests
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Summary */}
            {pendingCount === 0 && !loading && (
                <div className="card p-6 text-center bg-green-50 border-green-200">
                    <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-green-800 font-medium">All caught up!</p>
                    <p className="text-green-600 text-sm">No pending approvals</p>
                </div>
            )}
        </div>
    );
}
