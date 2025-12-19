import Link from "next/link";
import { Plus } from "lucide-react";
import LeadTable from "@/components/leads/LeadTable";

export default function LeadsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                    <p className="text-gray-500">Manage and track your leads</p>
                </div>
                <Link href="/dashboard/leads/new" className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead
                </Link>
            </div>

            <LeadTable />
        </div>
    );
}
