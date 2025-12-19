"use client";

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
} from "lucide-react";

interface Task {
    id: string;
    title: string;
    description: string | null;
    date: string;
    hoursWorked: number;
    status: string;
    user: { id: string; name: string; email: string };
    notes: TaskNote[];
    createdAt: string;
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
    });

    const isAdmin = session?.user?.role === "ADMIN";

    useEffect(() => {
        fetchTasks();
    }, [selectedMonth]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks?month=${selectedMonth}`);
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
                    <button onClick={() => { handleCancelForm(); setShowForm(true); }} className="btn-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                    </button>
                )}
            </div>

            {/* Stats */}
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

            {/* Add/Edit Task Form */}
            {showForm && (
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
            )}

            {/* Tasks List */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Task Log</h3>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="input w-auto"
                    />
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                    </div>
                ) : tasks.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {tasks.map((task) => {
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
                                    {selectedTaskForNote?.id === task.id && (
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
                                    )}
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
        </div>
    );
}
