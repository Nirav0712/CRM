"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
    Plus,
    Loader2,
    Clock,
    Check,
    MessageSquare,
    Send,
    Calendar,
    ClipboardList,
    Timer,
    Pencil,
    X,
    Building2,
    Search,
    RotateCcw,
    Zap,
} from "lucide-react";

interface Task {
    id: string;
    title: string;
    description: string | null;
    date: string;
    hoursWorked: number;
    status: string;
    clientId?: string;
    client?: { id: string; name: string; serviceType: string } | null;
    user: { id: string; name: string; email: string };
    notes: TaskNote[];
    createdAt: string;
}

interface Client {
    id: string;
    name: string;
    serviceType: string;
}

interface TaskNote {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
};

// Helper: Calculate Time Left based on Allocation
const calculateTimeLeft = (createdAtStr: string, hoursAllocated: number, status: string) => {
    if (status === "COMPLETED") return null;

    const created = new Date(createdAtStr);
    // Deadline = Created Time + Allocated Hours
    const deadline = new Date(created.getTime() + hoursAllocated * 60 * 60 * 1000);

    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return { text: "Overdue", color: "text-red-600 font-semibold" };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return { text: `${days}d ${hours}h left`, color: "text-blue-600" };

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${minutes}m left`, color: "text-orange-600 font-medium" };
};

export default function TasksPage() {
    const { data: session } = useSession();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Edit & Note states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedTaskForNote, setSelectedTaskForNote] = useState<Task | null>(null);

    const [noteContent, setNoteContent] = useState("");
    const [addingNote, setAddingNote] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        hoursWorked: "",
        status: "IN_PROGRESS",
        clientId: "",
    });

    const [clients, setClients] = useState<Client[]>([]);
    const [filterClientId, setFilterClientId] = useState("");
    const [staffMembers, setStaffMembers] = useState<{ id: string; name: string; email: string }[]>([]);
    const [filterStaffId, setFilterStaffId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [viewMode, setViewMode] = useState<"all" | "today">("all"); // New: Today/All view toggle

    const isAdmin = (session?.user as any)?.role === "ADMIN";

    useEffect(() => {
        fetchClients();
        if (isAdmin) {
            fetchStaffMembers();
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchTasks();
    }, [selectedMonth, filterClientId, filterStaffId, searchQuery]);

    const fetchClients = async () => {
        try {
            const res = await fetch("/api/clients");
            const data = await res.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching clients:", error);
        }
    };

    const fetchStaffMembers = async () => {
        try {
            const res = await fetch("/api/users");
            const data = await res.json();
            setStaffMembers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching staff:", error);
        }
    };

    const fetchTasks = async () => {
        setLoading(true);
        try {
            let url = `/api/tasks?month=${selectedMonth}`;
            if (filterClientId) {
                url += `&clientId=${filterClientId}`;
            }
            if (filterStaffId) {
                url += `&staffId=${filterStaffId}`;
            }
            if (searchQuery) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (task: Task) => {
        setFormData({
            title: task.title,
            description: task.description || "",
            hoursWorked: task.hoursWorked.toString(),
            date: new Date(task.date).toISOString().split('T')[0],
            status: task.status,
            clientId: task.clientId || "",
        });
        setEditingId(task.id);
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            title: "",
            description: "",
            date: new Date().toISOString().split("T")[0],
            hoursWorked: "",
            status: "IN_PROGRESS",
            clientId: "",
        });
    };

    const handleSubmitTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        try {
            const url = editingId ? `/api/tasks/${editingId}` : "/api/tasks";
            const method = editingId ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchTasks();
                handleCancelForm();
            } else {
                const error = await res.json();
                alert(error.error || "Failed to save task");
            }
        } catch (error) {
            console.error("Error saving task:", error);
        } finally {
            setProcessing(false);
        }
    };

    const handleAddNote = async (taskId: string) => {
        if (!noteContent.trim()) return;
        setAddingNote(true);
        try {
            const res = await fetch(`/api/tasks/${taskId}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: noteContent }),
            });

            if (res.ok) {
                fetchTasks();
                setNoteContent("");
                setSelectedTaskForNote(null);
            }
        } catch (error) {
            console.error("Error adding note:", error);
        } finally {
            setAddingNote(false);
        }
    };

    const handleUpdateStatus = async (taskId: string, status: string) => {
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            fetchTasks();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleQuickAdd = async (template: { title: string; description: string; hoursWorked: number }) => {
        setProcessing(true);
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...template,
                    date: new Date().toISOString().split("T")[0],
                    status: "IN_PROGRESS",
                    clientId: "",
                }),
            });
            if (res.ok) {
                fetchTasks();
                setShowQuickAdd(false);
            }
        } catch (error) {
            console.error("Error creating quick task:", error);
        } finally {
            setProcessing(false);
        }
    };

    const clearAllFilters = () => {
        setFilterClientId("");
        setFilterStaffId("");
        setSearchQuery("");
    };

    const handleResetCompletedToday = async () => {
        const today = new Date().toISOString().split("T")[0];

        // Find yesterday's completed tasks to reset for today
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const tasksToReset = tasks.filter(task => {
            const taskDate = new Date(task.date).toISOString().split("T")[0];
            return taskDate === yesterdayStr && task.status === "COMPLETED" && task.user.id === (session?.user as any)?.id;
        });

        if (tasksToReset.length === 0) {
            alert("No completed tasks from yesterday to reset for today");
            return;
        }

        if (!confirm(`Reset ${tasksToReset.length} task(s) from yesterday to today?`)) return;

        setProcessing(true);
        try {
            // Update task date to today and reset status to IN_PROGRESS
            await Promise.all(
                tasksToReset.map(task =>
                    fetch(`/api/tasks/${task.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            date: today,
                            status: "IN_PROGRESS"
                        })
                    })
                )
            );
            fetchTasks();
        } catch (error) {
            console.error("Error resetting tasks:", error);
            alert("Failed to reset tasks");
        } finally {
            setProcessing(false);
        }
    };

    // Calculate daily statistics for staff
    const getDailyStats = () => {
        if (isAdmin) return { totalTasks: 0, totalHours: 0, completedTasks: 0 };

        const today = new Date().toISOString().split("T")[0];
        const todayTasks = tasks.filter(task => {
            const taskDate = new Date(task.date).toISOString().split("T")[0];
            return taskDate === today;
        });

        return {
            totalTasks: todayTasks.length,
            totalHours: todayTasks.reduce((sum, task) => sum + task.hoursWorked, 0),
            completedTasks: todayTasks.filter(t => t.status === "COMPLETED").length
        };
    };

    const dailyStats = getDailyStats();

    // Calculate total hours
    const totalHours = tasks.reduce((sum, task) => sum + task.hoursWorked, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isAdmin ? "All Tasks" : "My Tasks"}
                    </h1>
                    <p className="text-gray-500">
                        {isAdmin ? "View and manage staff tasks" : "Log your work hours and tasks"}
                    </p>
                </div>
                {!isAdmin && (
                    <div className="flex flex-wrap gap-2">
                        {/* Today/All View Toggle */}
                        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                            <button
                                onClick={() => setViewMode("today")}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === "today"
                                    ? "bg-white text-primary-600 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setViewMode("all")}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === "all"
                                    ? "bg-white text-primary-600 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                All
                            </button>
                        </div>

                        {/* Reset Button - Move yesterday's tasks to today */}
                        <button
                            onClick={handleResetCompletedToday}
                            disabled={processing}
                            className="btn-secondary whitespace-nowrap"
                            title="Move yesterday's completed tasks to today"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset Day
                        </button>

                        <button
                            onClick={() => setShowQuickAdd(true)}
                            className="btn-secondary"
                            title="Quick add from template"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Quick Add
                        </button>
                        <button onClick={() => { handleCancelForm(); setShowForm(true); }} className="btn-primary">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task
                        </button>
                    </div>
                )}
            </div>

            {/* Stats - Dynamic based on view mode for staff */}
            {!isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">
                                    {viewMode === "today" ? "Tasks Today" : "Total Tasks"}
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {viewMode === "today" ? dailyStats.totalTasks : tasks.length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                                <Clock className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">
                                    {viewMode === "today" ? "Hours Today" : "Total Hours"}
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {viewMode === "today" ? dailyStats.totalHours.toFixed(1) : totalHours.toFixed(1)}h
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100">
                                <Check className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">
                                    {viewMode === "today" ? "Completed Today" : "Completed"}
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {viewMode === "today" ? dailyStats.completedTasks : tasks.filter(t => t.status === "COMPLETED").length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Stats for Admin */}
            {isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Tasks</p>
                                <p className="text-xl font-bold text-gray-900">{tasks.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                                <Clock className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Hours</p>
                                <p className="text-xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100">
                                <Check className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Completed</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {tasks.filter((t) => t.status === "COMPLETED").length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Task Form */}
            {
                showForm && (
                    <div className="card p-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingId ? "Edit Task" : "Log New Task"}
                            </h3>
                            <button onClick={handleCancelForm} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitTask} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="label">Task Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="input"
                                        placeholder="What did you work on?"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Date (Due/Target)</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Duration (Hours) / Estimate</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        max="24"
                                        value={formData.hoursWorked}
                                        onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                                        className="input"
                                        placeholder="e.g., 2.5"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="input"
                                    >
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Description (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="input"
                                        placeholder="Brief description..."
                                    />
                                </div>
                                <div>
                                    <label className="label">Client *</label>
                                    <select
                                        value={formData.clientId}
                                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                        className="input"
                                        required
                                    >
                                        <option value="">Select a Client</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>
                                                {client.name} ({client.serviceType})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="btn-primary" disabled={processing}>
                                    {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    {editingId ? "Save Changes" : "Add Task"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelForm}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Tasks List */}
            <div className="card overflow-hidden">
                <div className="flex flex-col gap-4 p-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">Task Log</h3>
                        <div className="flex gap-2">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="input w-auto text-sm"
                            />
                        </div>
                    </div>

                    {/* Search and Filter Row */}
                    {isAdmin && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search tasks, clients..."
                                    className="input pl-10 text-sm w-full"
                                />
                            </div>

                            {/* Staff Filter */}
                            <select
                                value={filterStaffId}
                                onChange={(e) => setFilterStaffId(e.target.value)}
                                className="input w-full sm:w-auto text-sm"
                            >
                                <option value="">All Staff</option>
                                {staffMembers.map(staff => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.name}
                                    </option>
                                ))}
                            </select>

                            {/* Client Filter */}
                            <select
                                value={filterClientId}
                                onChange={(e) => setFilterClientId(e.target.value)}
                                className="input w-full sm:w-auto text-sm"
                            >
                                <option value="">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>

                            {/* Clear Filters Button */}
                            {(filterClientId || filterStaffId || searchQuery) && (
                                <button
                                    onClick={clearAllFilters}
                                    className="btn-secondary text-sm whitespace-nowrap"
                                    title="Clear all filters"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Client filter for staff users */}
                    {!isAdmin && (
                        <div className="flex gap-2">
                            <select
                                value={filterClientId}
                                onChange={(e) => setFilterClientId(e.target.value)}
                                className="input w-auto text-sm"
                            >
                                <option value="">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Results count */}
                    {(searchQuery || filterStaffId || filterClientId) && !loading && (
                        <p className="text-sm text-gray-500">
                            Showing {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                        </p>
                    )}
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                    </div>
                ) : tasks.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {tasks
                            .filter(task => {
                                // Filter for today's tasks if in "today" view mode (staff only)
                                if (!isAdmin && viewMode === "today") {
                                    const today = new Date().toISOString().split("T")[0];
                                    const taskDate = new Date(task.date).toISOString().split("T")[0];
                                    return taskDate === today;
                                }
                                return true;
                            })
                            .map((task) => {
                                const timeLeft = calculateTimeLeft(task.createdAt, task.hoursWorked, task.status);

                                // Check if current user is owner (for edit button display)
                                const isOwner = session?.user?.id === task.user.id;

                                return (
                                    <div key={task.id} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-start transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h4 className="font-medium text-gray-900 text-lg">{task.title}</h4>
                                                <span className={`badge ${STATUS_COLORS[task.status]}`}>
                                                    {task.status.replace("_", " ")}
                                                </span>
                                                <span className="badge bg-primary-100 text-primary-800">
                                                    {task.hoursWorked}h
                                                </span>
                                                {task.client && (
                                                    <span className="badge bg-indigo-100 text-indigo-800 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {task.client.name} • {task.client.serviceType}
                                                    </span>
                                                )}
                                            </div>

                                            {task.description && (
                                                <p className="text-gray-600 mb-2">{task.description}</p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                                                <div className="flex items-center gap-1" title="Target Date">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(task.date)}
                                                </div>
                                                <div className="flex items-center gap-1" title="Created At">
                                                    <Clock className="w-4 h-4" />
                                                    Created: {formatDateTime(task.createdAt)}
                                                </div>
                                                {timeLeft && (
                                                    <div className={`flex items-center gap-1 ${timeLeft.color}`}>
                                                        <Timer className="w-4 h-4" />
                                                        {timeLeft.text}
                                                    </div>
                                                )}
                                                {isAdmin && (
                                                    <div className="flex items-center gap-1 text-gray-400">
                                                        <span>• by {task.user.name}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Notes */}
                                            {task.notes && task.notes.length > 0 && (
                                                <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-100">
                                                    {task.notes.map((note) => (
                                                        <div
                                                            key={note.id}
                                                            className="bg-gray-50 rounded p-2 text-sm"
                                                        >
                                                            <p className="text-gray-700">{note.content}</p>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {note.user.name} • {formatDateTime(note.createdAt)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex sm:flex-col gap-2 mt-4 sm:mt-0 sm:ml-4">
                                            {/* Edit Button (Only for owner and NOT completed, or allow editing completed too?) */}
                                            {/* Allowing edit for Owner regardless of status */}
                                            {!isAdmin && isOwner && (
                                                <button
                                                    onClick={() => handleEditClick(task)}
                                                    className="btn-secondary text-sm py-1 px-3 whitespace-nowrap"
                                                    title="Edit Task"
                                                >
                                                    <Pencil className="w-3 h-3 mr-1" />
                                                    Edit
                                                </button>
                                            )}

                                            {task.status === "IN_PROGRESS" && (
                                                <button
                                                    onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                                                    className="btn-secondary text-sm py-1 px-3 whitespace-nowrap"
                                                >
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Complete
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSelectedTaskForNote(selectedTaskForNote?.id === task.id ? null : task)}
                                                className="btn-secondary text-sm py-1 px-3 whitespace-nowrap"
                                            >
                                                <MessageSquare className="w-3 h-3 mr-1" />
                                                Note
                                            </button>
                                        </div>

                                        {/* Add Note Form Modal/Inline */}
                                        {
                                            selectedTaskForNote?.id === task.id && (
                                                <div className="basis-full mt-3 sm:mt-0 pt-3 border-t sm:border-0 border-gray-100 w-full sm:basis-auto">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={noteContent}
                                                            onChange={(e) => setNoteContent(e.target.value)}
                                                            className="input flex-1"
                                                            placeholder={isAdmin ? "Add feedback..." : "Add a note..."}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleAddNote(task.id)}
                                                            className="btn-primary py-2"
                                                            disabled={addingNote || !noteContent.trim()}
                                                        >
                                                            {addingNote ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Send className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        No tasks logged for this month
                    </div>
                )}
            </div>

            {/* Quick Add Modal */}
            {
                showQuickAdd && !isAdmin && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    Quick Add Task
                                </h3>
                                <button
                                    onClick={() => setShowQuickAdd(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Choose a common task template to quickly log your work:</p>
                            <div className="space-y-2">
                                {[
                                    { title: "Client Meeting", description: "Meeting with client to discuss project", hoursWorked: 1 },
                                    { title: "Email Communication", description: "Responding to client emails", hoursWorked: 0.5 },
                                    { title: "Project Planning", description: "Planning and strategizing project tasks", hoursWorked: 2 },
                                    { title: "Development Work", description: "Coding and development tasks", hoursWorked: 4 },
                                    { title: "Testing & QA", description: "Testing and quality assurance", hoursWorked: 2 },
                                    { title: "Documentation", description: "Writing documentation and reports", hoursWorked: 1.5 },
                                ].map((template, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuickAdd(template)}
                                        disabled={processing}
                                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-all group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 group-hover:text-primary-700">{template.title}</p>
                                                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                                            </div>
                                            <span className="badge bg-primary-100 text-primary-700 ml-2">{template.hoursWorked}h</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
