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
    Search,
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
    ipAddress?: string;
    location?: {
        latitude: number;
        longitude: number;
        timestamp: number;
    };
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

// Helper to get user's location using browser Geolocation API
const getUserLocation = (): Promise<{ latitude: number; longitude: number; timestamp: number } | null> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.log("Geolocation is not supported by this browser");
            resolve(null);
            return;
        }

        const timeoutId = setTimeout(() => {
            console.log("Geolocation timeout");
            resolve(null);
        }, 5000); // 5 second timeout

        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timeoutId);
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: position.timestamp,
                });
            },
            (error) => {
                clearTimeout(timeoutId);
                console.log("Geolocation error:", error.message);
                resolve(null); // Don't fail, just return null
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            }
        );
    });
};

export default function AttendancePage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"attendance" | "leaves">("attendance");
    const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [staffSearchQuery, setStaffSearchQuery] = useState("");

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
        fetchLocationTrackingSetting();
    }, [selectedMonth]);

    const fetchLocationTrackingSetting = async () => {
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                setLocationTrackingEnabled(data.location_tracking_enabled !== false);
            }
        } catch (error) {
            console.error("Error fetching location tracking setting:", error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const [attRes, leaveRes] = await Promise.all([
                fetch(`/api/attendance?month=${selectedMonth}`),
                fetch("/api/leave")
            ]);
            const attData = await attRes.json();
            const leaveData = await leaveRes.json();

            setAttendance(Array.isArray(attData) ? attData : []);
            setLeaveRequests(Array.isArray(leaveData) ? leaveData : []);
        } catch (error) {
            console.error("Error fetching data:", error);
            setAttendance([]);
            setLeaveRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        setProcessing(true);
        try {
            const now = new Date();
            const dateStr = getLocalDateStr(now);

            // Only try to get location if tracking is enabled
            let location = null;
            if (locationTrackingEnabled) {
                location = await getUserLocation();
            }

            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: dateStr,
                    status: "PRESENT",
                    checkIn: now.toISOString(),
                    location, // Will be null if user denied or failed
                }),
            });
            if (res.ok) {
                fetchAttendance();
            } else {
                const err = await res.json();
                // Only show alert for actual errors, not geolocation issues
                if (err.error && !err.error.includes("location")) {
                    alert(err.error || "Failed to check in");
                }
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

            // Only try to get location if tracking is enabled
            let location = null;
            if (locationTrackingEnabled) {
                location = await getUserLocation();
            }

            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: dateStr,
                    checkOut: now.toISOString(),
                    location, // Will be null if user denied or failed
                }),
            });
            if (res.ok) {
                fetchAttendance();
            } else {
                const err = await res.json();
                if (err.error && !err.error.includes("location")) {
                    alert(err.error || "Failed to check out");
                }
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

            // Only try to get location if tracking is enabled
            let location = null;
            if (locationTrackingEnabled) {
                location = await getUserLocation();
            }

            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: dateStr,
                    status: "ABSENT",
                    location, // Will be null if user denied or failed
                }),
            });
            if (res.ok) {
                fetchAttendance();
            } else {
                const err = await res.json();
                if (err.error && !err.error.includes("location")) {
                    alert(err.error || "Failed to mark absent");
                }
            }
        } catch (error) {
            console.error(error);
            setProcessing(false);
        }
    };

    const handleEditLeave = (leave: any) => {
        setEditingLeaveId(leave.id);
        setLeaveData({
            startDate: new Date(leave.startDate).toISOString().split('T')[0],
            endDate: new Date(leave.endDate).toISOString().split('T')[0],
            leaveType: leave.leaveType,
            reason: leave.reason,
        });
        setShowLeaveForm(true);
    };

    const handleDeleteLeave = async (leaveId: string) => {
        if (!confirm("Are you sure you want to delete this leave request?")) return;

        try {
            const res = await fetch(`/api/leave/${leaveId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                alert("Leave request deleted successfully");
                fetchAttendance();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to delete leave request");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while deleting the leave request");
        }
    };

    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApplyingLeave(true);
        try {
            const url = editingLeaveId ? `/api/leave/${editingLeaveId}` : "/api/leave";
            const method = editingLeaveId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leaveData),
            });

            if (res.ok) {
                setShowLeaveForm(false);
                setEditingLeaveId(null);
                setLeaveData({ startDate: "", endDate: "", leaveType: "FULL_DAY", reason: "" });
                fetchAttendance();
                alert(editingLeaveId ? "Leave request updated successfully" : "Leave request submitted for approval");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to save leave request");
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
        return recordDateStr === todayStr && a.user?.id === session?.user?.id;
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
            </div>

            {/* Search and Month Filter Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {isAdmin && (
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={staffSearchQuery}
                            onChange={(e) => setStaffSearchQuery(e.target.value)}
                            placeholder="Search by staff name..."
                            className="input pl-10 w-full"
                        />
                    </div>
                )}
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

            {/* Attendance & Leave History Tabs */}
            <div className="card overflow-hidden">
                {!isAdmin && (
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab("attendance")}
                            className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === "attendance"
                                ? "border-primary-500 text-primary-600 bg-primary-50/30"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <Clock className="w-4 h-4 inline mr-2" />
                            Attendance History
                        </button>
                        <button
                            onClick={() => setActiveTab("leaves")}
                            className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === "leaves"
                                ? "border-primary-500 text-primary-600 bg-primary-50/30"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Leave Requests
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" /></div>
                ) : (
                    <>
                        {/* Search Results Count */}
                        {isAdmin && staffSearchQuery && (
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                <p className="text-sm text-gray-600">
                                    Showing {attendance.filter(record =>
                                        record.user?.name?.toLowerCase().includes(staffSearchQuery.toLowerCase())
                                    ).length} of {attendance.length} records
                                </p>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            {activeTab === "attendance" ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            {isAdmin && <th className="p-4 font-medium text-gray-500">Staff</th>}
                                            <th className="p-4 font-medium text-gray-500">Date</th>
                                            <th className="p-4 font-medium text-gray-500">Status</th>
                                            <th className="p-4 font-medium text-gray-500">Check In</th>
                                            <th className="p-4 font-medium text-gray-500">Check Out</th>
                                            <th className="p-4 font-medium text-gray-500">Duration</th>
                                            {isAdmin && <th className="p-4 font-medium text-gray-500">Location</th>}
                                            <th className="p-4 font-medium text-gray-500">Approval</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {attendance.length > 0 ? (
                                            attendance
                                                .filter(record => {
                                                    // Filter by staff search query for admin
                                                    if (isAdmin && staffSearchQuery) {
                                                        return record.user?.name?.toLowerCase().includes(staffSearchQuery.toLowerCase());
                                                    }
                                                    return true;
                                                })
                                                .map((record) => (
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
                                                        {isAdmin && (
                                                            <td className="p-4 text-gray-600 text-xs">
                                                                {record.ipAddress ? (
                                                                    <div className="space-y-1">
                                                                        <div className="font-mono text-gray-500">
                                                                            IP: {record.ipAddress}
                                                                        </div>
                                                                        {record.location && (
                                                                            <div>
                                                                                <a
                                                                                    href={`https://www.google.com/maps?q=${record.location.latitude},${record.location.longitude}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-primary-600 hover:text-primary-700 underline"
                                                                                >
                                                                                    {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                                                                                </a>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="p-4">
                                                            <span className={`badge ${APPROVAL_COLORS[record.approvalStatus]}`}>
                                                                {record.approvalStatus}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td colSpan={isAdmin ? 8 : 6} className="p-8 text-center text-gray-500">
                                                    No attendance records found for this month.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 font-medium text-gray-500">Period</th>
                                            <th className="p-4 font-medium text-gray-500">Type</th>
                                            <th className="p-4 font-medium text-gray-500">Reason</th>
                                            <th className="p-4 font-medium text-gray-500">Status</th>
                                            <th className="p-4 font-medium text-gray-500">Submitted</th>
                                            <th className="p-4 font-medium text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {leaveRequests.length > 0 ? (
                                            leaveRequests.map((leave) => (
                                                <tr key={leave.id} className="hover:bg-gray-50">
                                                    <td className="p-4 text-gray-600">
                                                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="badge bg-blue-100 text-blue-800">
                                                            {leave.leaveType.replace("_", " ")}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-600 max-w-xs truncate">
                                                        {leave.reason}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`badge ${APPROVAL_COLORS[leave.status]}`}>
                                                            {leave.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-500">
                                                        {formatDate(leave.createdAt)}
                                                    </td>
                                                    <td className="p-4">
                                                        {leave.status === "PENDING" && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleEditLeave(leave)}
                                                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteLeave(leave.id)}
                                                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                                    No leave requests found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Leave Application Modal */}
            {showLeaveForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingLeaveId ? "Edit Leave Request" : "Apply for Leave"}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowLeaveForm(false);
                                    setEditingLeaveId(null);
                                    setLeaveData({ startDate: "", endDate: "", leaveType: "FULL_DAY", reason: "" });
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleLeaveSubmit} className="space-y-4">
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
