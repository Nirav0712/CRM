'use client';

import { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
    requestNotificationPermission,
    isNotificationEnabled,
    toggleNotificationMute,
    isNotificationMuted
} from '@/lib/notifications';

export default function NotificationSettings() {
    const { data: session } = useSession();
    const [enabled, setEnabled] = useState(false);
    const [muted, setMuted] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        setEnabled(isNotificationEnabled());
        setMuted(isNotificationMuted());
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const handleEnableNotifications = async () => {
        if (!session?.user?.id) {
            console.error('No user session');
            return;
        }

        setIsRegistering(true);

        try {
            // Request basic notification permission
            const granted = await requestNotificationPermission();
            setEnabled(granted);
            setPermission(granted ? 'granted' : 'denied');
        } catch (error) {
            console.error('Error enabling notifications:', error);
        } finally {
            setIsRegistering(false);
        }
    };

    const handleToggleMute = () => {
        const newMutedState = toggleNotificationMute();
        setMuted(newMutedState);
        setEnabled(!newMutedState);
    };

    return (
        <div className="bg-white rounded-lg">
            {permission === 'default' && (
                <button
                    onClick={handleEnableNotifications}
                    disabled={isRegistering}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Bell className="w-4 h-4" />
                    {isRegistering ? 'Enabling...' : 'Enable Desktop Notifications'}
                </button>
            )}

            {permission === 'denied' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                        <strong>Notifications Blocked</strong>
                        <br />
                        Please enable notifications in your browser settings
                    </p>
                </div>
            )}

            {permission === 'granted' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <div>
                                <span className="text-sm font-medium text-green-800 block">
                                    Notifications Enabled
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleMute}
                            className={`p-2 rounded-lg transition-colors ${muted
                                ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                            title={muted ? 'Unmute notifications' : 'Mute notifications'}
                        >
                            {muted ? (
                                <VolumeX className="w-4 h-4" />
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1 pl-3">
                        <p className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-600" />
                            New message alerts
                        </p>
                        <p className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-600" />
                            Priority messages with sound
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

