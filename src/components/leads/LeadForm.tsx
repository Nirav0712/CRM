"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LEAD_STATUSES, LeadStatus } from "@/lib/utils";
import { Lead, LeadSource, Tag, User } from "@/types";
import { X, Plus, Loader2 } from "lucide-react";

interface LeadFormProps {
    lead?: Lead;
    isEdit?: boolean;
}

export default function LeadForm({ lead, isEdit = false }: LeadFormProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [sources, setSources] = useState<LeadSource[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [newSource, setNewSource] = useState("");
    const [newTag, setNewTag] = useState("");
    const [showNewSource, setShowNewSource] = useState(false);
    const [showNewTag, setShowNewTag] = useState(false);

    const [formData, setFormData] = useState({
        name: lead?.name || "",
        companyName: lead?.companyName || "",
        email: lead?.email || "",
        phone: lead?.phone || "",
        address: lead?.address || "",
        city: lead?.city || "",
        country: lead?.country || "",
        website: lead?.website || "",
        leadValue: lead?.leadValue?.toString() || "",
        description: lead?.description || "",
        status: lead?.status || "PENDING",
        sourceId: lead?.sourceId || "",
        assignedToId: lead?.assignedToId || session?.user?.id || "",
        tagIds: lead?.tags?.map((t) => t.tagId) || [],
    });

    useEffect(() => {
        fetchSources();
        fetchTags();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (session?.user?.id && !formData.assignedToId) {
            setFormData((prev) => ({ ...prev, assignedToId: session.user.id }));
        }
    }, [session?.user?.id]);

    const fetchSources = async () => {
        try {
            const res = await fetch("/api/sources");
            const data = await res.json();
            setSources(data);
        } catch (error) {
            console.error("Error fetching sources:", error);
        }
    };

    const fetchTags = async () => {
        try {
            const res = await fetch("/api/tags");
            const data = await res.json();
            setTags(data);
        } catch (error) {
            console.error("Error fetching tags:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = isEdit ? `/api/leads/${lead?.id}` : "/api/leads";
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/dashboard/leads");
                router.refresh();
            } else {
                const error = await res.json();
                alert(error.error || "Failed to save lead");
            }
        } catch (error) {
            console.error("Error saving lead:", error);
            alert("Failed to save lead");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSource = async () => {
        if (!newSource.trim()) return;

        try {
            const res = await fetch("/api/sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newSource.trim() }),
            });

            if (res.ok) {
                const source = await res.json();
                setSources([...sources, source]);
                setFormData({ ...formData, sourceId: source.id });
                setNewSource("");
                setShowNewSource(false);
            }
        } catch (error) {
            console.error("Error adding source:", error);
        }
    };

    const handleAddTag = async () => {
        if (!newTag.trim()) return;

        try {
            const res = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTag.trim() }),
            });

            if (res.ok) {
                const tag = await res.json();
                setTags([...tags, tag]);
                setFormData({ ...formData, tagIds: [...formData.tagIds, tag.id] });
                setNewTag("");
                setShowNewTag(false);
            }
        } catch (error) {
            console.error("Error adding tag:", error);
        }
    };

    const toggleTag = (tagId: string) => {
        setFormData((prev) => ({
            ...prev,
            tagIds: prev.tagIds.includes(tagId)
                ? prev.tagIds.filter((id) => id !== tagId)
                : [...prev.tagIds, tagId],
        }));
    };

    const isAdmin = session?.user?.role === "ADMIN";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            className="input"
                            placeholder="Enter lead name"
                        />
                    </div>

                    <div>
                        <label className="label">Company Name</label>
                        <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) =>
                                setFormData({ ...formData, companyName: e.target.value })
                            }
                            className="input"
                            placeholder="Enter company name"
                        />
                    </div>

                    <div>
                        <label className="label">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                            }
                            className="input"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div>
                        <label className="label">Phone Number</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                            }
                            className="input"
                            placeholder="+91 XXXXX XXXXX"
                        />
                    </div>

                    <div>
                        <label className="label">Website</label>
                        <input
                            type="url"
                            value={formData.website}
                            onChange={(e) =>
                                setFormData({ ...formData, website: e.target.value })
                            }
                            className="input"
                            placeholder="https://example.com"
                        />
                    </div>

                    <div>
                        <label className="label">Lead Value (₹)</label>
                        <input
                            type="number"
                            value={formData.leadValue}
                            onChange={(e) =>
                                setFormData({ ...formData, leadValue: e.target.value })
                            }
                            className="input"
                            placeholder="Enter value in INR"
                        />
                    </div>
                </div>
            </div>

            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Address Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="label">Address</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                            }
                            className="input"
                            placeholder="Enter full address"
                        />
                    </div>

                    <div>
                        <label className="label">City</label>
                        <input
                            type="text"
                            value={formData.city}
                            onChange={(e) =>
                                setFormData({ ...formData, city: e.target.value })
                            }
                            className="input"
                            placeholder="Enter city"
                        />
                    </div>

                    <div>
                        <label className="label">Country</label>
                        <input
                            type="text"
                            value={formData.country}
                            onChange={(e) =>
                                setFormData({ ...formData, country: e.target.value })
                            }
                            className="input"
                            placeholder="Enter country"
                        />
                    </div>
                </div>
            </div>

            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Lead Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) =>
                                setFormData({ ...formData, status: e.target.value })
                            }
                            className="input"
                        >
                            {Object.entries(LEAD_STATUSES).map(([key, value]) => (
                                <option key={key} value={key}>
                                    {value.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Source</label>
                        {showNewSource ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSource}
                                    onChange={(e) => setNewSource(e.target.value)}
                                    className="input flex-1"
                                    placeholder="Enter new source"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSource}
                                    className="btn-primary"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowNewSource(false)}
                                    className="btn-secondary"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <select
                                    value={formData.sourceId}
                                    onChange={(e) =>
                                        setFormData({ ...formData, sourceId: e.target.value })
                                    }
                                    className="input flex-1"
                                >
                                    <option value="">Select source</option>
                                    {sources.map((source) => (
                                        <option key={source.id} value={source.id}>
                                            {source.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowNewSource(true)}
                                    className="btn-secondary"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="label">Assigned To</label>
                        <select
                            value={formData.assignedToId}
                            onChange={(e) =>
                                setFormData({ ...formData, assignedToId: e.target.value })
                            }
                            className="input"
                            disabled={!isAdmin && isEdit}
                        >
                            <option value="">Select staff member</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.role})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                    {tags.map((tag) => (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`badge cursor-pointer transition-all ${formData.tagIds.includes(tag.id)
                                    ? "ring-2 ring-primary-500 ring-offset-2"
                                    : "opacity-60 hover:opacity-100"
                                }`}
                            style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                            }}
                        >
                            {tag.name}
                        </button>
                    ))}
                </div>
                {showNewTag ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            className="input flex-1 max-w-xs"
                            placeholder="Enter new tag"
                            autoFocus
                        />
                        <button type="button" onClick={handleAddTag} className="btn-primary">
                            Add Tag
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowNewTag(false)}
                            className="btn-secondary"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowNewTag(true)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Tag
                    </button>
                )}
            </div>

            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                <textarea
                    value={formData.description}
                    onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                    }
                    className="input min-h-[120px]"
                    placeholder="Add any notes or description about this lead..."
                />
            </div>

            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-secondary"
                >
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {isEdit ? "Update Lead" : "Create Lead"}
                </button>
            </div>
        </form>
    );
}
