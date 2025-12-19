import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value);
};

export const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const formatDateTime = (date: Date | string): string => {
    return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const LEAD_STATUSES = {
    REJECT: { label: "Rejected", color: "bg-red-100 text-red-800" },
    PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    INTERESTED_FUTURE: { label: "Interested (Future)", color: "bg-blue-100 text-blue-800" },
    NOT_PICKED: { label: "Not Picked", color: "bg-gray-100 text-gray-800" },
    NOT_CONNECTING: { label: "Not Connecting", color: "bg-orange-100 text-orange-800" },
    CUSTOMER: { label: "Customer", color: "bg-green-100 text-green-800" },
} as const;

export type LeadStatus = keyof typeof LEAD_STATUSES;
