"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { LeadSource } from "@/types";
import { formatDate } from "@/lib/utils";
import { Plus, Loader2, Layers } from "lucide-react";

export default function SourcesPage() {
    const [sources, setSources] = useState<LeadSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSource, setNewSource] = useState("");
    const [adding, setAdding] = useState(false);

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
                    <h3 className="font-semibold text-gray-900">All Sources</h3>
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
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary-100">
                                        <Layers className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <span className="font-medium text-gray-900">{source.name}</span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    Added {formatDate(source.createdAt)}
                                </span>
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
