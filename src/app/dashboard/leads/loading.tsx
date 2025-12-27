import { Loader2 } from "lucide-react";

export default function LeadsLoading() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-48 bg-gray-100 rounded animate-pulse mt-2"></div>
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <div className="card overflow-hidden">
                {/* Filter skeleton */}
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4">
                    <div className="h-10 w-48 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-10 w-40 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-10 w-40 bg-gray-100 rounded animate-pulse"></div>
                </div>

                {/* Table skeleton */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <th key={i} className="p-4">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                                <tr key={row} className="border-b border-gray-100">
                                    {[1, 2, 3, 4, 5].map((col) => (
                                        <td key={col} className="p-4">
                                            <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Loading indicator */}
                <div className="p-8 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <span className="ml-3 text-gray-500">Loading leads...</span>
                </div>
            </div>
        </div>
    );
}
