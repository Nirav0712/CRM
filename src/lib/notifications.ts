/**
 * Browser Notification Utilities for Chat
 * Standard browser-level notifications (Firebase removed)
 */

export type NotificationPriority = 'high' | 'normal';

interface ChatNotificationOptions {
    title: string;
    body: string;
    priority?: NotificationPriority;
    chatId?: string;
    senderId?: string;
    icon?: string;
    tag?: string;
}

class ChatNotificationManager {
    private permission: NotificationPermission = 'default';
    private isMuted: boolean = false;

    constructor() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permission = Notification.permission;
            // Load mute state from localStorage
            this.isMuted = localStorage.getItem('chat_notifications_muted') === 'true';
        }
    }

    /**
     * Request notification permission from user
     */
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        const permission = await Notification.requestPermission();
        this.permission = permission;
        return permission === 'granted';
    }

    /**
     * Check if notifications are supported and permitted
     */
    isSupported(): boolean {
        return typeof window !== 'undefined' && 'Notification' in window;
    }

    /**
     * Check if notifications are enabled
     */
    isEnabled(): boolean {
        return this.isSupported() && this.permission === 'granted' && !this.isMuted;
    }

    /**
     * Toggle mute state
     */
    toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        localStorage.setItem('chat_notifications_muted', String(this.isMuted));
        return this.isMuted;
    }

    /**
     * Get current mute state
     */
    isMutedState(): boolean {
        return this.isMuted;
    }

    /**
     * Show a chat notification
     */
    async showNotification(options: ChatNotificationOptions): Promise<void> {
        if (!this.isEnabled()) {
            return;
        }

        const {
            title,
            body,
            priority = 'normal',
            chatId,
            senderId,
            icon = '/logo.png',
            tag = chatId || 'chat-notification'
        } = options;

        try {
            const notification = new Notification(title, {
                body,
                icon,
                tag, // Prevents duplicate notifications
                badge: '/logo.png',
                requireInteraction: priority === 'high', // High priority stays until clicked
                silent: false,
                data: {
                    chatId,
                    senderId,
                    priority,
                    timestamp: Date.now()
                }
            });

            // Handle notification click - focus window and open chat
            notification.onclick = () => {
                window.focus();
                if (chatId) {
                    // Navigate to chat
                    window.location.href = `/dashboard/chat?openChat=${chatId}`;
                }
                notification.close();
            };

            // Play notification sound for high priority
            if (priority === 'high') {
                this.playNotificationSound();
            }

            // Auto-close normal priority notifications after 5 seconds
            if (priority === 'normal') {
                setTimeout(() => {
                    notification.close();
                }, 5000);
            }
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    /**
     * Show notification for new message
     */
    async notifyNewMessage(
        senderName: string,
        messageText: string,
        chatId: string,
        senderId: string,
        isGroupChat: boolean = false,
        priority: NotificationPriority = 'normal'
    ): Promise<void> {
        const title = isGroupChat
            ? `${senderName} in All Office Members`
            : `New message from ${senderName}`;

        // Truncate long messages
        const body = messageText.length > 100
            ? messageText.substring(0, 100) + '...'
            : messageText;

        await this.showNotification({
            title,
            body,
            priority,
            chatId,
            senderId,
            tag: chatId
        });
    }

    /**
     * Play notification sound
     */
    private playNotificationSound(): void {
        try {
            // Create a simple beep sound using Web Audio API
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    /**
     * Clear all notifications for a chat
     */
    clearNotifications(chatId?: string): void {
        console.log('Clearing notifications for:', chatId);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        // No FCM listener to unsubscribe from
    }
}

// Export singleton instance
export const notificationManager = new ChatNotificationManager();

// Export helper functions
export const requestNotificationPermission = () => notificationManager.requestPermission();
export const isNotificationEnabled = () => notificationManager.isEnabled();
export const toggleNotificationMute = () => notificationManager.toggleMute();
export const isNotificationMuted = () => notificationManager.isMutedState();
export const notifyNewMessage = (
    senderName: string,
    messageText: string,
    chatId: string,
    senderId: string,
    isGroupChat?: boolean,
    priority?: NotificationPriority
) => notificationManager.notifyNewMessage(
    senderName,
    messageText,
    chatId,
    senderId,
    isGroupChat,
    priority
);

