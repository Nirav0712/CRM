"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Tag } from "@/types";
import { formatDate } from "@/lib/utils";
import { Plus, Loader2, Tag as TagIcon, Pencil, Trash2, Check, X } from "lucide-react";

const TAG_COLORS = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#22c55e", // green
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
];

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTag, setNewTag] = useState("");
    const [newColor, setNewColor] = useState(TAG_COLORS[0]);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const res = await fetch("/api/tags");
            const data = await res.json();
            setTags(data);
        } catch (error) {
            console.error("Error fetching tags:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTag.trim()) return;

        setAdding(true);
        try {
            const res = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTag.trim(), color: newColor }),
            });

            if (res.ok) {
                const tag = await res.json();
                setTags([...tags, tag].sort((a, b) => a.name.localeCompare(b.name)));
                setNewTag("");
                setNewColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
            }
        } catch (error) {
            console.error("Error adding tag:", error);
        } finally {
            setAdding(false);
        }
    };

    const handleEdit = (tag: Tag) => {
        setEditingId(tag.id);
        setEditName(tag.name);
        setEditColor(tag.color);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditColor("");
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;

        setUpdating(true);
        try {
            const res = await fetch(`/api/tags/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim(), color: editColor }),
            });

            if (res.ok) {
                const updated = await res.json();
                setTags(tags.map(t => t.id === id ? updated : t).sort((a, b) => a.name.localeCompare(b.name)));
                setEditingId(null);
                setEditName("");
                setEditColor("");
            } else {
                const error = await res.json();
                alert(error.error || "Failed to update tag");
            }
        } catch (error) {
            console.error("Error updating tag:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this tag?")) return;

        setDeleting(id);
        try {
            const res = await fetch(`/api/tags/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setTags(tags.filter(t => t.id !== id));
            } else {
                const error = await res.json();
                alert(error.error || "Failed to delete tag");
            }
        } catch (error) {
            console.error("Error deleting tag:", error);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
                <p className="text-gray-500">
                    Create and manage tags to organize your leads
                </p>
            </div>

            {/* Add new tag */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Tag</h3>
                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Enter tag name (e.g., Hot Lead, Follow Up)"
                            className="input flex-1"
                        />
                        <button type="submit" className="btn-primary" disabled={adding || !newTag.trim()}>
                            {adding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add
                                </>
                            )}
                        </button>
                    </div>
                    <div>
                        <label className="label">Color</label>
                        <div className="flex gap-2">
                            {TAG_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setNewColor(color)}
                                    className={`w-8 h-8 rounded-full transition-transform ${newColor === color ? "scale-110 ring-2 ring-offset-2 ring-gray-400" : ""
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                    {newTag && (
                        <div>
                            <label className="label">Preview</label>
                            <span
                                className="badge"
                                style={{
                                    backgroundColor: `${newColor}20`,
                                    color: newColor,
                                }}
                            >
                                {newTag}
                            </span>
                        </div>
                    )}
                </form>
            </div>

            {/* Tags list */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">All Tags ({tags.length})</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                    </div>
                ) : tags.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className="flex items-center justify-between p-4 hover:bg-gray-50"
                            >
                                {editingId === tag.id ? (
                                    <>
                                        <div className="flex items-center gap-3 flex-1">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="input flex-1"
                                                autoFocus
                                            />
                                            <div className="flex gap-1">
                                                {TAG_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setEditColor(color)}
                                                        className={`w-6 h-6 rounded-full transition-transform ${editColor === color ? "scale-110 ring-2 ring-offset-1 ring-gray-400" : ""
                                                            }`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleUpdate(tag.id)}
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
                                            <div>
                                                <span
                                                    className="badge"
                                                    style={{
                                                        backgroundColor: `${tag.color}20`,
                                                        color: tag.color,
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Added {formatDate(tag.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(tag)}
                                                className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                                                title="Edit tag"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tag.id)}
                                                disabled={deleting === tag.id}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete tag"
                                            >
                                                {deleting === tag.id ? (
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
                        No tags yet. Add your first tag above.
                    </div>
                )}
            </div>
        </div>
    );
}
