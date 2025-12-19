"use client";

import { LEAD_STATUSES, LeadStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: string;
    size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
    const statusInfo = LEAD_STATUSES[status as LeadStatus] || {
        label: status,
        color: "bg-gray-100 text-gray-800",
    };

    return (
        <span
            className={cn(
                "badge",
                statusInfo.color,
                size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"
            )}
        >
            {statusInfo.label}
        </span>
    );
}
