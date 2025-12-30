"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { LeadSource } from "@/types";
import { formatDate } from "@/lib/utils";
import { Plus, Loader2, Layers, Pencil, Trash2, Check, X } from "lucide-react";

export default function SourcesPage() {
    const [sources, setSources] = useState<LeadSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSource, setNewSource] = useState("");
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        try {
            const res = await fetch("/api/sources");
            const data = await res.json();
            setSources(data);
        } catch (error) {
            console.error("Error fetching sources:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSource.trim()) return;

        setAdding(true);
        try {
            const res = await fetch("/api/sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newSource.trim() }),
            });

            if (res.ok) {
                const source = await res.json();
                setSources([...sources, source].sort((a, b) => a.name.localeCompare(b.name)));
                setNewSource("");
            }
        } catch (error) {
            console.error("Error adding source:", error);
        } finally {
            setAdding(false);
        }
    };

    const handleEdit = (source: LeadSource) => {
        setEditingId(source.id);
        setEditName(source.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;

        setUpdating(true);
        try {
            const res = await fetch(`/api/sources/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim() }),
            });

            if (res.ok) {
                const updated = await res.json();
                setSources(sources.map(s => s.id === id ? updated : s).sort((a, b) => a.name.localeCompare(b.name)));
                setEditingId(null);
                setEditName("");
            } else {
                const error = await res.json();
                alert(error.error || "Failed to update source");
            }
        } catch (error) {
            console.error("Error updating source:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this source?")) return;

        setDeleting(id);
        try {
            const res = await fetch(`/api/sources/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setSources(sources.filter(s => s.id !== id));
            } else {
                const error = await res.json();
                alert(error.error || "Failed to delete source");
            }
        } catch (error) {
            console.error("Error deleting source:", error);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Lead Sources</h1>
                <p className="text-gray-500">
                    Manage your lead sources for tracking where leads come from
                </p>
            </div>

            {/* Add new source */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Add New Source
                </h3>
                <form onSubmit={handleAdd} className="flex gap-3">
                    <input
                        type="text"
                        value={newSource}
                        onChange={(e) => setNewSource(e.target.value)}
                        placeholder="Enter source name (e.g., LinkedIn, Trade Show)"
                        className="input flex-1"
                    />
                    <button type="submit" className="btn-primary" disabled={adding || !newSource.trim()}>
                        {adding ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Add
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Sources list */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">All Sources ({sources.length})</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                    </div>
                ) : sources.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {sources.map((source) => (
                            <div
                                key={source.id}
                                className="flex items-center justify-between p-4 hover:bg-gray-50"
                            >
                                {editingId === source.id ? (
                                    <>
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="p-2 rounded-lg bg-primary-100">
                                                <Layers className="w-5 h-5 text-primary-600" />
                                            </div>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="input flex-1"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleUpdate(source.id)}
                                                disabled={updating || !editName.trim()}
                                                className="btn-primary text-sm py-1 px-3"
                                            >
                                                {updating ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="btn-secondary text-sm py-1 px-3"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary-100">
                                                <Layers className="w-5 h-5 text-primary-600" />
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-900">{source.name}</span>
                                                <p className="text-xs text-gray-500">
                                                    Added {formatDate(source.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(source)}
                                                className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                                                title="Edit source"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(source.id)}
                                                disabled={deleting === source.id}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete source"
                                            >
                                                {deleting === source.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        No sources yet. Add your first source above.
                    </div>
                )}
            </div>
        </div>
    );
}
