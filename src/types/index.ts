import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: "ADMIN" | "STAFF";
        };
    }

    interface User {
        id: string;
        email: string;
        name: string;
        role: "ADMIN" | "STAFF";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: "ADMIN" | "STAFF";
    }
}

export interface Lead {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    website: string | null;
    leadValue: number | null;
    description: string | null;
    status: string;
    sourceId: string | null;
    assignedToId: string;
    createdAt: Date;
    updatedAt: Date;
    source?: LeadSource | null;
    assignedTo?: User;
    tags?: TagOnLead[];
    statusHistory?: StatusHistory[];
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface LeadSource {
    id: string;
    name: string;
    createdAt: Date;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    createdAt: Date;
}

export interface TagOnLead {
    leadId: string;
    tagId: string;
    tag?: Tag;
}

export interface StatusHistory {
    id: string;
    leadId: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    changedAt: Date;
}

export interface LeadFilters {
    search?: string;
    status?: string[];
    sourceId?: string[];
    assignedToId?: string;
    tagIds?: string[];
    dateFrom?: string;
    dateTo?: string;
}
