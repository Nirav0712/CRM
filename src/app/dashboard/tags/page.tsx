"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Tag } from "@/types";
import { formatDate } from "@/lib/utils";
import { Plus, Loader2, Tag as TagIcon } from "lucide-react";

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
                    <h3 className="font-semibold text-gray-900">All Tags</h3>
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
                                <div className="flex items-center gap-3">
                                    <span
                                        className="badge"
                                        style={{
                                            backgroundColor: `${tag.color}20`,
                                            color: tag.color,
                                        }}
                                    >
                                        {tag.name}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    Added {formatDate(tag.createdAt)}
                                </span>
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
