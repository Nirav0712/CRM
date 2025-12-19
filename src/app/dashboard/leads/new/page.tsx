import LeadForm from "@/components/leads/LeadForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewLeadPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/leads"
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Add New Lead</h1>
                    <p className="text-gray-500">Fill in the details below</p>
                </div>
            </div>

            <LeadForm />
        </div>
    );
}
