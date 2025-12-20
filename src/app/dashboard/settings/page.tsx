"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Shield, Network, Save, CheckCircle, RefreshCw } from "lucide-react";

export default function SettingsPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ipValue, setIpValue] = useState("");
    const [currentConfiguredIp, setCurrentConfiguredIp] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
    const [passSaving, setPassSaving] = useState(false);
    const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            const data = await res.json();
            if (res.ok) {
                setCurrentConfiguredIp(data.office_ip);
                setIpValue(data.office_ip || "");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveIp = async (ipToSave: string) => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ office_ip: ipToSave }),
            });
            const data = await res.json();

            if (res.ok) {
                setCurrentConfiguredIp(data.office_ip);
                setIpValue(data.office_ip);
                setMessage({ type: "success", text: `Office IP updated successfully to ${data.office_ip}` });
            } else {
                setMessage({ type: "error", text: data.error || "Failed to update IP" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "An error occurred" });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMessage(null);

        if (passwords.new !== passwords.confirm) {
            setPassMessage({ type: "error", text: "New passwords do not match" });
            return;
        }

        if (passwords.new.length < 6) {
            setPassMessage({ type: "error", text: "Password must be at least 6 characters" });
            return;
        }

        setPassSaving(true);
        try {
            const res = await fetch("/api/users/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: passwords.current,
                    newPassword: passwords.new,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                setPassMessage({ type: "success", text: "Password updated successfully" });
                setPasswords({ current: "", new: "", confirm: "" });
            } else {
                setPassMessage({ type: "error", text: data.error || "Failed to update password" });
            }
        } catch (error) {
            setPassMessage({ type: "error", text: "An error occurred" });
        } finally {
            setPassSaving(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    if (session?.user?.role !== "ADMIN") {
        return <div className="p-8 text-red-600">Unauthorized Access</div>;
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-500">Manage global application configurations and account security.</p>
            </div>

            {/* Attendance Restrictions */}
            <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Network className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Attendance Restrictions</h3>
                        <p className="text-sm text-gray-500">Restrict staff attendance marking to specific networks.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700 font-medium mb-1">Current Configured Office IP:</p>
                        <div className="flex items-center gap-2">
                            <code className="bg-white px-3 py-1 rounded border border-gray-300 font-mono text-gray-800">
                                {currentConfiguredIp || "Not Configured (All Allowed)"}
                            </code>
                            {currentConfiguredIp && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                    </div>

                    <div>
                        <label className="label">Allowed IP Address</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={ipValue}
                                onChange={(e) => setIpValue(e.target.value)}
                                className="input font-mono"
                                placeholder="e.g. 192.168.1.1 or 203.0.113.1"
                            />
                            <button
                                onClick={() => handleSaveIp(ipValue)}
                                disabled={saving}
                                className="btn-primary whitespace-nowrap"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Enter the <b>Public IP</b> or <b>LAN IP</b> of your office network.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Auto-detect current network:</span>
                            <button
                                onClick={() => handleSaveIp("CURRENT")}
                                disabled={saving}
                                className="btn-secondary text-sm"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Detect & Save My Current IP
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Detected: Your current IP will be saved (likely 127.0.0.1 if using localhost).
                        </p>
                    </div>
                </div>

                {message && (
                    <div className={`mt-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Account Security */}
            <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
                        <p className="text-sm text-gray-500">Update your account password.</p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="label">Current Password</label>
                        <input
                            type="password"
                            value={passwords.current}
                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                            className="input"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">New Password</label>
                            <input
                                type="password"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={passSaving}
                            className="btn-primary w-full md:w-auto"
                        >
                            {passSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Update Password
                        </button>
                    </div>

                    {passMessage && (
                        <div className={`p-3 rounded text-sm ${passMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {passMessage.text}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
