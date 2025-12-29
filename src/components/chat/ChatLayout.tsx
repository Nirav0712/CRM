'use client';

import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import ConversationList from './ConversationList';
import MessageDisplay from './MessageDisplay';
import MessageInput from './MessageInput';
import UserSelector from './UserSelector';
import { ChatUser } from '@/types/chat';
import { updateUserPresence, subscribeToPresence } from '@/lib/realtimeDb';

interface ChatLayoutProps {
    currentUserId: string;
    currentUserName: string;
    currentUserRole?: string;
    users: ChatUser[];
}

export default function ChatLayout({ currentUserId, currentUserName, currentUserRole, users }: ChatLayoutProps) {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [selectedChatName, setSelectedChatName] = useState<string>('');
    const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
    const [otherUserStatus, setOtherUserStatus] = useState<{ status: 'online' | 'offline', lastSeen: number } | null>(null);

    // Update user presence on mount and cleanup
    useEffect(() => {
        updateUserPresence(currentUserId, 'online');

        // Update presence to offline on unmount or page close
        const handleBeforeUnload = () => {
            updateUserPresence(currentUserId, 'offline');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            updateUserPresence(currentUserId, 'offline');
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentUserId]);

    // Heartbeat to keep user online
    useEffect(() => {
        const interval = setInterval(() => {
            updateUserPresence(currentUserId, 'online');
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [currentUserId]);

    // Subscribe to other user's presence in direct chats
    useEffect(() => {
        if (!selectedChatId || !selectedChatId.startsWith('direct/')) {
            setOtherUserStatus(null);
            return;
        }

        // Extract other user ID from chat ID
        const chatIdParts = selectedChatId.replace('direct/', '').split('_');
        const otherUserId = chatIdParts.find(id => id !== currentUserId);

        if (otherUserId) {
            const unsubscribe = subscribeToPresence(otherUserId, (status, lastSeen) => {
                setOtherUserStatus({ status, lastSeen });
            });

            return () => unsubscribe();
        }
    }, [selectedChatId, currentUserId]);

    const handleSelectChat = (chatId: string, chatName: string) => {
        setSelectedChatId(chatId);
        setSelectedChatName(chatName);
    };

    const handleChatCreated = (chatId: string, chatName: string) => {
        setSelectedChatId(chatId);
        setSelectedChatName(chatName);
    };

    const formatLastSeen = (timestamp: number) => {
        const now = Date.now();
        const diffInMs = now - timestamp;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        if (diffInHours < 24) return `${diffInHours} hours ago`;

        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
            {/* Left Sidebar - Conversation List */}
            <div className="w-80 border-r bg-white flex-shrink-0">
                <ConversationList
                    currentUserId={currentUserId}
                    selectedChatId={selectedChatId}
                    onSelectChat={handleSelectChat}
                    onNewMessage={() => setIsUserSelectorOpen(true)}
                />
            </div>

            {/* Right Panel - Messages */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                {selectedChatId && (
                    <div className="bg-white border-b px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <MessageCircle className="w-6 h-6 text-blue-600" />
                                    {/* Online indicator for direct chats */}
                                    {selectedChatId.startsWith('direct/') && otherUserStatus && otherUserStatus.status === 'online' && (
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900">{selectedChatName}</h2>
                                    <p className="text-sm text-gray-500">
                                        {selectedChatId.startsWith('group/') ? (
                                            'Group Chat'
                                        ) : otherUserStatus ? (
                                            otherUserStatus.status === 'online' ? (
                                                <span className="text-green-600 font-medium">● Online</span>
                                            ) : (
                                                <span>Last seen {formatLastSeen(otherUserStatus.lastSeen)}</span>
                                            )
                                        ) : (
                                            'Direct Message'
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages Display */}
                <MessageDisplay
                    chatId={selectedChatId}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                />

                {/* Message Input */}
                <MessageInput
                    chatId={selectedChatId}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    currentUserRole={currentUserRole}
                />
            </div>

            {/* User Selector Modal */}
            <UserSelector
                isOpen={isUserSelectorOpen}
                onClose={() => setIsUserSelectorOpen(false)}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                users={users}
                onChatCreated={handleChatCreated}
            />
        </div>
    );
}
