"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Lead, LeadSource, Tag, User } from "@/types";
import { formatCurrency, formatDate, LEAD_STATUSES, LeadStatus } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import {
    Search,
    Filter,
    X,
    Eye,
    Edit,
    Trash2,
    ChevronDown,
    Phone,
    Mail,
    Building,
    Calendar,
    IndianRupee,
} from "lucide-react";

export default function LeadTable() {
    const { data: session } = useSession();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [sources, setSources] = useState<LeadSource[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [sourceFilter, setSourceFilter] = useState<string[]>([]);
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const [staffFilter, setStaffFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const isAdmin = session?.user?.role === "ADMIN";

    useEffect(() => {
        fetchFiltersData();
        fetchLeads();
    }, []);

    const fetchFiltersData = async () => {
        try {
            const [sourcesRes, tagsRes, usersRes] = await Promise.all([
                fetch("/api/sources"),
                fetch("/api/tags"),
                fetch("/api/users"),
            ]);
            setSources(await sourcesRes.json());
            setTags(await tagsRes.json());
            setUsers(await usersRes.json());
        } catch (error) {
            console.error("Error fetching filter data:", error);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            statusFilter.forEach((s) => params.append("status", s));
            sourceFilter.forEach((s) => params.append("sourceId", s));
            tagFilter.forEach((t) => params.append("tagId", t));
            if (staffFilter) params.append("assignedToId", staffFilter);
            if (dateFrom) params.append("dateFrom", dateFrom);
            if (dateTo) params.append("dateTo", dateTo);

            const res = await fetch(`/api/leads?${params.toString()}`);
            const data = await res.json();
            setLeads(data);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchLeads();
        }, 300);
        return () => clearTimeout(debounce);
    }, [search, statusFilter, sourceFilter, tagFilter, staffFilter, dateFrom, dateTo]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;

        try {
            const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
            if (res.ok) {
                setLeads(leads.filter((l) => l.id !== id));
            } else {
                const error = await res.json();
                alert(error.error || "Failed to delete lead");
            }
        } catch (error) {
            console.error("Error deleting lead:", error);
        }
    };

    const clearFilters = () => {
        setSearch("");
        setStatusFilter([]);
        setSourceFilter([]);
        setTagFilter([]);
        setStaffFilter("");
        setDateFrom("");
        setDateTo("");
    };

    const hasActiveFilters =
        search ||
        statusFilter.length > 0 ||
        sourceFilter.length > 0 ||
        tagFilter.length > 0 ||
        staffFilter ||
        dateFrom ||
        dateTo;

    const toggleArrayFilter = (
        arr: string[],
        setArr: React.Dispatch<React.SetStateAction<string[]>>,
        value: string
    ) => {
        setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
    };

    return (
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="card p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, phone, or company..."
                            className="input pl-10"
                        />
                    </div>

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary ${showFilters ? "bg-gray-100" : ""}`}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-2 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
                                !
                            </span>
                        )}
                    </button>

                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="btn-secondary text-red-600">
                            <X className="w-4 h-4 mr-2" />
                            Clear
                        </button>
                    )}
                </div>

                {/* Filter panels */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {/* Status */}
                        <div>
                            <label className="label">Status</label>
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(LEAD_STATUSES).map(([key, value]) => (
                                    <button
                                        key={key}
                                        onClick={() => toggleArrayFilter(statusFilter, setStatusFilter, key)}
                                        className={`badge cursor-pointer ${statusFilter.includes(key)
                                            ? value.color
                                            : "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {value.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Source */}
                        <div>
                            <label className="label">Source</label>
                            <div className="flex flex-wrap gap-1">
                                {sources.map((source) => (
                                    <button
                                        key={source.id}
                                        onClick={() =>
                                            toggleArrayFilter(sourceFilter, setSourceFilter, source.id)
                                        }
                                        className={`badge cursor-pointer ${sourceFilter.includes(source.id)
                                            ? "bg-primary-100 text-primary-700"
                                            : "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {source.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="label">Tags</label>
                            <div className="flex flex-wrap gap-1">
                                {tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleArrayFilter(tagFilter, setTagFilter, tag.id)}
                                        className={`badge cursor-pointer ${tagFilter.includes(tag.id)
                                            ? "ring-2 ring-offset-1"
                                            : "opacity-60"
                                            }`}
                                        style={{
                                            backgroundColor: `${tag.color}20`,
                                            color: tag.color,
                                            ['--tw-ring-color' as any]: tag.color,
                                        }}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Staff (Admin Only) */}
                        {isAdmin && (
                            <div>
                                <label className="label">Assigned To</label>
                                <select
                                    value={staffFilter}
                                    onChange={(e) => setStaffFilter(e.target.value)}
                                    className="input"
                                >
                                    <option value="">All Staff</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date Range */}
                        <div>
                            <label className="label">From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="label">To Date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="input"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500">
                {loading ? "Loading..." : `${leads.length} lead${leads.length !== 1 ? "s" : ""} found`}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                    Lead
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                    Contact
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                    Source
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                    Value
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                    Assigned To
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                    Date
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-gray-900">{lead.name}</p>
                                            {lead.companyName && (
                                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                                    <Building className="w-3 h-3" />
                                                    {lead.companyName}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            {lead.email && (
                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {lead.email}
                                                </p>
                                            )}
                                            {lead.phone && (
                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {lead.phone}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={lead.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-600">
                                            {lead.source?.name || "-"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {lead.leadValue ? (
                                            <span className="text-sm font-medium text-gray-900">
                                                {formatCurrency(lead.leadValue)}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-600">
                                            {lead.assignedTo?.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-500">
                                            {formatDate(lead.createdAt)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/dashboard/leads/${lead.id}`}
                                                className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/dashboard/leads/${lead.id}/edit`}
                                                className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(lead.id)}
                                                    className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
                {leads.map((lead) => (
                    <div key={lead.id} className="card p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-medium text-gray-900">{lead.name}</h3>
                                {lead.companyName && (
                                    <p className="text-sm text-gray-500">{lead.companyName}</p>
                                )}
                            </div>
                            <StatusBadge status={lead.status} size="sm" />
                        </div>

                        <div className="space-y-2 text-sm">
                            {lead.email && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="w-4 h-4" />
                                    <a href={`mailto:${lead.email}`} className="hover:text-primary-600">
                                        {lead.email}
                                    </a>
                                </div>
                            )}
                            {lead.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="w-4 h-4" />
                                    <a href={`tel:${lead.phone}`} className="hover:text-primary-600">
                                        {lead.phone}
                                    </a>
                                </div>
                            )}
                            {lead.leadValue && (
                                <div className="flex items-center gap-2 text-gray-900 font-medium">
                                    <IndianRupee className="w-4 h-4" />
                                    {formatCurrency(lead.leadValue)}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                {formatDate(lead.createdAt)}
                            </div>
                        </div>

                        {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                                {lead.tags.map((t) => (
                                    <span
                                        key={t.tagId}
                                        className="badge text-xs"
                                        style={{
                                            backgroundColor: `${t.tag?.color}20`,
                                            color: t.tag?.color,
                                        }}
                                    >
                                        {t.tag?.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                            <span className="text-sm text-gray-500">
                                {lead.assignedTo?.name}
                            </span>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/dashboard/leads/${lead.id}`}
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                >
                                    View
                                </Link>
                                <Link
                                    href={`/dashboard/leads/${lead.id}/edit`}
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                >
                                    Edit
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {!loading && leads.length === 0 && (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No leads found</h3>
                    <p className="text-gray-500 mb-4">
                        {hasActiveFilters
                            ? "Try adjusting your filters"
                            : "Get started by creating your first lead"}
                    </p>
                    {!hasActiveFilters && (
                        <Link href="/dashboard/leads/new" className="btn-primary">
                            Add Your First Lead
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
