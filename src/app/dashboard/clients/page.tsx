"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";
import {
    Plus,
    Loader2,
    Building2,
    Phone,
    Mail,
    MapPin,
    Pencil,
    Trash2,
    X,
    Briefcase,
    Search,
} from "lucide-react";

interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    serviceType: string;
    address: string;
    notes: string;
    createdAt: string;
}

const SERVICE_TYPES = [
    "Web Development",
    "App Development",
    "UI/UX Design",
    "Digital Marketing",
    "SEO Services",
    "Content Writing",
    "Social Media Management",
    "Consultation",
    "Maintenance & Support",
    "Other"
];

const SERVICE_COLORS: Record<string, string> = {
    "Web Development": "bg-blue-100 text-blue-800",
    "App Development": "bg-purple-100 text-purple-800",
    "UI/UX Design": "bg-pink-100 text-pink-800",
    "Digital Marketing": "bg-orange-100 text-orange-800",
    "SEO Services": "bg-green-100 text-green-800",
    "Content Writing": "bg-yellow-100 text-yellow-800",
    "Social Media Management": "bg-cyan-100 text-cyan-800",
    "Consultation": "bg-indigo-100 text-indigo-800",
    "Maintenance & Support": "bg-teal-100 text-teal-800",
    "Other": "bg-gray-100 text-gray-800",
};

export default function ClientsPage() {
    const { data: session } = useSession();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterServiceType, setFilterServiceType] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        serviceType: "Web Development",
        address: "",
        notes: "",
    });

    const [customServiceType, setCustomServiceType] = useState("");

    const isAdmin = (session?.user as any)?.role === "ADMIN";

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/clients");
            const data = await res.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching clients:", error);
            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (client: Client) => {
        // Check if the service type is a custom one (not in the predefined list)
        const isCustomService = !SERVICE_TYPES.includes(client.serviceType);

        setFormData({
            name: client.name,
            email: client.email || "",
            phone: client.phone || "",
            serviceType: isCustomService ? "Other" : client.serviceType,
            address: client.address || "",
            notes: client.notes || "",
        });

        if (isCustomService) {
            setCustomServiceType(client.serviceType);
        } else {
            setCustomServiceType("");
        }

        setEditingId(client.id);
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            name: "",
            email: "",
            phone: "",
            serviceType: "Web Development",
            address: "",
            notes: "",
        });
        setCustomServiceType("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        try {
            const url = editingId ? `/api/clients/${editingId}` : "/api/clients";
            const method = editingId ? "PUT" : "POST";

            // Use custom service type if "Other" is selected and custom type is provided
            const finalServiceType = formData.serviceType === "Other" && customServiceType.trim()
                ? customServiceType.trim()
                : formData.serviceType;

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, serviceType: finalServiceType }),
            });

            if (res.ok) {
                fetchClients();
                handleCancelForm();
            } else {
                const error = await res.json();
                alert(error.error || "Failed to save client");
            }
        } catch (error) {
            console.error("Error saving client:", error);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (clientId: string) => {
        if (!confirm("Are you sure you want to delete this client?")) return;

        try {
            const res = await fetch(`/api/clients/${clientId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchClients();
            } else {
                const error = await res.json();
                alert(error.error || "Failed to delete client");
            }
        } catch (error) {
            console.error("Error deleting client:", error);
        }
    };

    // Filter clients
    const filteredClients = clients.filter((client) => {
        const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !filterServiceType || client.serviceType === filterServiceType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-500">Manage your client list and service types</p>
                </div>
                {isAdmin && (
                    <button onClick={() => { handleCancelForm(); setShowForm(true); }} className="btn-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Client
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Clients</p>
                            <p className="text-xl font-bold text-gray-900">{clients.length}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                            <Briefcase className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Service Types</p>
                            <p className="text-xl font-bold text-gray-900">
                                {new Set(clients.map(c => c.serviceType)).size}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                            <Mail className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">With Email</p>
                            <p className="text-xl font-bold text-gray-900">
                                {clients.filter(c => c.email).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clients..."
                        className="input pl-10 w-full"
                    />
                </div>
                <select
                    value={filterServiceType}
                    onChange={(e) => setFilterServiceType(e.target.value)}
                    className="input w-full sm:w-48"
                >
                    <option value="">All Service Types</option>
                    {SERVICE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="card p-6 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingId ? "Edit Client" : "Add New Client"}
                        </h3>
                        <button onClick={handleCancelForm} className="text-gray-500 hover:text-gray-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Client Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    placeholder="Company or Client Name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Service Type *</label>
                                <select
                                    value={formData.serviceType}
                                    onChange={(e) => {
                                        setFormData({ ...formData, serviceType: e.target.value });
                                        if (e.target.value !== "Other") {
                                            setCustomServiceType("");
                                        }
                                    }}
                                    className="input"
                                    required
                                >
                                    {SERVICE_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.serviceType === "Other" && (
                                <div className="sm:col-span-2">
                                    <label className="label">Custom Service Type *</label>
                                    <input
                                        type="text"
                                        value={customServiceType}
                                        onChange={(e) => setCustomServiceType(e.target.value)}
                                        className="input"
                                        placeholder="Enter custom service type"
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input"
                                    placeholder="client@example.com"
                                />
                            </div>
                            <div>
                                <label className="label">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="input"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="label">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input"
                                    placeholder="City, State"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="label">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="input min-h-[80px]"
                                    placeholder="Additional notes about this client..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="btn-primary" disabled={processing}>
                                {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {editingId ? "Save Changes" : "Add Client"}
                            </button>
                            <button type="button" onClick={handleCancelForm} className="btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Clients List */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Client List</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                    </div>
                ) : filteredClients.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {filteredClients.map((client) => (
                            <div key={client.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <h4 className="font-semibold text-gray-900 text-lg">{client.name}</h4>
                                            <span className={`badge ${SERVICE_COLORS[client.serviceType] || SERVICE_COLORS["Other"]}`}>
                                                {client.serviceType}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                            {client.email && (
                                                <div className="flex items-center gap-1">
                                                    <Mail className="w-4 h-4" />
                                                    {client.email}
                                                </div>
                                            )}
                                            {client.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-4 h-4" />
                                                    {client.phone}
                                                </div>
                                            )}
                                            {client.address && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {client.address}
                                                </div>
                                            )}
                                        </div>
                                        {client.notes && (
                                            <p className="text-sm text-gray-600 mt-2">{client.notes}</p>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditClick(client)}
                                                className="btn-secondary text-sm py-1 px-3"
                                            >
                                                <Pencil className="w-3 h-3 mr-1" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="btn-secondary text-sm py-1 px-3 text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        {searchQuery || filterServiceType ? "No clients match your search" : "No clients yet. Add your first client!"}
                    </div>
                )}
            </div>
        </div>
    );
}
