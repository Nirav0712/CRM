'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import {
    requestNotificationPermission,
    isNotificationEnabled,
    toggleNotificationMute,
    isNotificationMuted
} from '@/lib/notifications';

export default function NotificationSettings() {
    const [enabled, setEnabled] = useState(false);
    const [muted, setMuted] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        setEnabled(isNotificationEnabled());
        setMuted(isNotificationMuted());
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const handleEnableNotifications = async () => {
        const granted = await requestNotificationPermission();
        setEnabled(granted);
        setPermission(granted ? 'granted' : 'denied');
    };

    const handleToggleMute = () => {
        const newMutedState = toggleNotificationMute();
        setMuted(newMutedState);
        setEnabled(!newMutedState);
    };

    return (
        <div className="bg-white rounded-lg">
            {/* <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
            </div> */}

            {permission === 'default' && (
                <button
                    onClick={handleEnableNotifications}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Bell className="w-4 h-4" />
                    Enable Desktop Notifications
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
                    {/* <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-800">
                                Notifications Enabled
                            </span>
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
                    </div> */}

                    {/* <div className="text-xs text-gray-600 space-y-1">
                        <p>✓ New message alerts</p>
                        <p>✓ Works even when tab is inactive</p>
                        <p>✓ Priority messages with sound</p>
                    </div> */}
                </div>
            )}
        </div>
    );
}
