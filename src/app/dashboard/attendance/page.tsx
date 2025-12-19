"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";
import {
    Calendar,
    Clock,
    Check,
    X,
    Loader2,
    CalendarPlus,
    Send,
    User,
    LogOut,
} from "lucide-react";

interface Attendance {
    id: string;
    date: string;
    status: string;
    approvalStatus: string;
    checkIn: string | null;
    checkOut: string | null;
    note: string | null;
    approvedBy: string | null;
    user: { id: string; name: string; email: string };
}

const STATUS_COLORS: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800",
    HALF_DAY: "bg-yellow-100 text-yellow-800",
    ABSENT: "bg-red-100 text-red-800",
    ON_LEAVE: "bg-blue-100 text-blue-800",
    PENDING: "bg-gray-100 text-gray-800",
};

const APPROVAL_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
};

// Helper to calculate duration
const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return "-";
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();
    if (diff < 0) return "Invalid";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
};

// Helper for Local Date String (YYYY-MM-DD)
const getLocalDateStr = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function AttendancePage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    // Leave form state
    const [leaveData, setLeaveData] = useState({
        startDate: "",
        endDate: "",
        leaveType: "FULL_DAY",
        reason: "",
    });
    const [applyingLeave, setApplyingLeave] = useState(false);

    useEffect(() => {
        fetchAttendance();
    }, [selectedMonth]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/attendance?month=${selectedMonth}`);
            const data = await res.json();
            setAttendance(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching attendance:", error);
            setAttendance([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        setProcessing(true);
        try {
            const now = new Date();
            const dateStr = getLocalDateStr(now);

            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: dateStr,
                    status: "PRESENT",
                    checkIn: now.toISOString(),
                }),
            });
            if (res.ok) fetchAttendance();
            else {
                const err = await res.json();
                alert(err.error || "Failed to check in");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const handleCheckOut = async () => {
        setProcessing(true);
        try {
            const now = new Date();
            const dateStr = getLocalDateStr(now);

            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: dateStr,
                    checkOut: now.toISOString(),
                }),
            });
            if (res.ok) fetchAttendance();
            else {
                const err = await res.json();
                alert(err.error || "Failed to check out");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const handleMarkAbsent = async () => {
        if (!confirm("Are you sure you want to mark yourself absent for today?")) return;
        setProcessing(true);
        try {
            const now = new Date();
            const dateStr = getLocalDateStr(now);

            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: dateStr,
                    status: "ABSENT",
                }),
            });
            if (res.ok) fetchAttendance();
            else {
                const err = await res.json();
                alert(err.error || "Failed to mark absent");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        setApplyingLeave(true);
        try {
            const res = await fetch("/api/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leaveData),
            });
            if (res.ok) {
                setShowLeaveForm(false);
                setLeaveData({ startDate: "", endDate: "", leaveType: "FULL_DAY", reason: "" });
                alert("Leave request submitted for approval");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to apply leave");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setApplyingLeave(false);
        }
    };

    // Staff: Find today's record
    const todayStr = getLocalDateStr();
    // Filter attendance to find record where date matches today and user matches session user
    const todayRecord = attendance.find(a => {
        const recordDateStr = getLocalDateStr(new Date(a.date));
        return recordDateStr === todayStr && a.user.id === session?.user?.id;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isAdmin ? "Attendance History" : "My Attendance"}
                    </h1>
                    <p className="text-gray-500">
                        {isAdmin ? "View staff attendance records" : "Manage your daily attendance"}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="input py-2"
                    />
                    {!isAdmin && (
                        <button
                            onClick={() => setShowLeaveForm(true)}
                            className="btn-secondary whitespace-nowrap"
                        >
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            Apply Leave
                        </button>
                    )}
                </div>
            </div>

            {/* Status Cards (Staff Only) */}
            {!isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Today's Action */}
                    <div className="card p-6 md:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h3>

                        {!todayRecord ? (
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={handleCheckIn}
                                    disabled={processing}
                                    className="btn-primary py-3 px-6 text-lg flex items-center shadow-lg hover:shadow-xl transition-all"
                                >
                                    {processing ? <Loader2 className="animate-spin mr-2" /> : <Clock className="mr-2" />}
                                    Check In
                                </button>
                                <button
                                    onClick={handleMarkAbsent}
                                    disabled={processing}
                                    className="btn-danger py-3 px-6 text-lg shadow-sm"
                                >
                                    Mark Absent
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                {/* Status Indicator */}
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Status</p>
                                    <span className={`badge text-base px-3 py-1 ${STATUS_COLORS[todayRecord.status]}`}>
                                        {todayRecord.status.replace("_", " ")}
                                    </span>
                                </div>

                                {/* Times */}
                                {(todayRecord.checkIn || todayRecord.checkOut) && (
                                    <div className="space-y-1">
                                        {todayRecord.checkIn && (
                                            <p className="text-sm font-medium text-gray-700">
                                                Check In: <span className="font-mono text-gray-500">{new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        )}
                                        {todayRecord.checkOut && (
                                            <p className="text-sm font-medium text-gray-700">
                                                Check Out: <span className="font-mono text-gray-500">{new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Next Action */}
                                {!todayRecord.checkOut && todayRecord.status === 'PRESENT' && (
                                    <button
                                        onClick={handleCheckOut}
                                        disabled={processing}
                                        className="btn-secondary bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 py-2 px-6 text-lg flex items-center shadow-md animate-pulse"
                                    >
                                        {processing ? <Loader2 className="animate-spin mr-2" /> : <LogOut className="mr-2" />}
                                        Check Out
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Monthly Stats */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Month Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                                <span className="text-green-800 font-medium">Present</span>
                                <span className="text-green-800 font-bold">{attendance.filter(a => a.status === 'PRESENT').length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-red-50 p-2 rounded">
                                <span className="text-red-800 font-medium">Absent</span>
                                <span className="text-red-800 font-bold">{attendance.filter(a => a.status === 'ABSENT').length}</span>
                            </div>
                            <div className="flex justify-between items-center bg-blue-50 p-2 rounded">
                                <span className="text-blue-800 font-medium">Leaves</span>
                                <span className="text-blue-800 font-bold">{attendance.filter(a => a.status === 'ON_LEAVE').length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance History Table */}
            <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">
                        {isAdmin ? "All Staff Attendance Records" : "Attendance History"}
                    </h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {isAdmin && <th className="p-4 font-medium text-gray-500">Staff</th>}
                                    <th className="p-4 font-medium text-gray-500">Date</th>
                                    <th className="p-4 font-medium text-gray-500">Status</th>
                                    <th className="p-4 font-medium text-gray-500">Check In</th>
                                    <th className="p-4 font-medium text-gray-500">Check Out</th>
                                    <th className="p-4 font-medium text-gray-500">Duration</th>
                                    <th className="p-4 font-medium text-gray-500">Approval</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendance.length > 0 ? (
                                    attendance.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            {isAdmin && (
                                                <td className="p-4 font-medium text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs">
                                                            {record.user.name.charAt(0)}
                                                        </div>
                                                        {record.user.name}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="p-4 text-gray-600">
                                                {formatDate(record.date)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${STATUS_COLORS[record.status]}`}>
                                                    {record.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-600 font-mono">
                                                {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className="p-4 text-gray-600 font-mono">
                                                {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className="p-4 text-gray-600 font-medium">
                                                {calculateDuration(record.checkIn, record.checkOut)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${APPROVAL_COLORS[record.approvalStatus]}`}>
                                                    {record.approvalStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-gray-500">
                                            No attendance records found for this month.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Leave Application Modal */}
            {showLeaveForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Apply for Leave</h3>
                            <button onClick={() => setShowLeaveForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleApplyLeave} className="space-y-4">
                            <div>
                                <label className="label">Start Date</label>
                                <input type="date" className="input" required value={leaveData.startDate} onChange={e => setLeaveData({ ...leaveData, startDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">End Date</label>
                                <input type="date" className="input" required value={leaveData.endDate} onChange={e => setLeaveData({ ...leaveData, endDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Type</label>
                                <select className="input" value={leaveData.leaveType} onChange={e => setLeaveData({ ...leaveData, leaveType: e.target.value })}>
                                    <option value="FULL_DAY">Full Day</option>
                                    <option value="HALF_DAY">Half Day</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Reason</label>
                                <textarea className="input" rows={3} required value={leaveData.reason} onChange={e => setLeaveData({ ...leaveData, reason: e.target.value })} placeholder="Reason for leave..."></textarea>
                            </div>
                            <button type="submit" className="btn-primary w-full" disabled={applyingLeave}>
                                {applyingLeave ? <Loader2 className="animate-spin mx-auto" /> : "Submit Request"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
