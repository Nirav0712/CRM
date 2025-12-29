'use client';

import { useEffect, useState } from 'react';
import { Users, MessageCircle, Plus } from 'lucide-react';
import { Chat } from '@/types/chat';
import { subscribeToUserChats, initializeGroupChat, subscribeToPresence } from '@/lib/realtimeDb';

interface ConversationListProps {
    currentUserId: string;
    selectedChatId: string | null;
    onSelectChat: (chatId: string, chatName: string) => void;
    onNewMessage: () => void;
}

interface UserPresenceStatus {
    [userId: string]: {
        status: 'online' | 'offline';
        lastSeen: number;
    };
}

export default function ConversationList({
    currentUserId,
    selectedChatId,
    onSelectChat,
    onNewMessage
}: ConversationListProps) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [userPresence, setUserPresence] = useState<UserPresenceStatus>({});

    useEffect(() => {
        // Initialize group chat
        initializeGroupChat();

        // Subscribe to user's chats
        const unsubscribe = subscribeToUserChats(currentUserId, (userChats) => {
            setChats(userChats);
            setLoading(false);

            // Subscribe to presence for all direct chat participants
            userChats.forEach(chat => {
                if (chat.type === 'direct' && chat.participantIds) {
                    chat.participantIds.forEach(participantId => {
                        if (participantId !== currentUserId) {
                            subscribeToPresence(participantId, (status, lastSeen) => {
                                setUserPresence(prev => ({
                                    ...prev,
                                    [participantId]: { status, lastSeen }
                                }));
                            });
                        }
                    });
                }
            });
        });

        return () => unsubscribe();
    }, [currentUserId]);

    const formatTime = (timestamp?: number) => {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours < 1) {
            const minutes = Math.floor(diffInMs / (1000 * 60));
            return minutes < 1 ? 'Just now' : `${minutes}m ago`;
        } else if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const formatLastSeen = (timestamp: number) => {
        const now = Date.now();
        const diffInMs = now - timestamp;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;

        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getChatDisplayName = (chat: Chat) => {
        if (chat.type === 'group') {
            return chat.name || 'All Office Members';
        } else {
            // For direct chats, show the other participant's name
            return chat.name || 'Unknown User';
        }
    };

    const getOtherParticipantId = (chat: Chat): string | null => {
        if (chat.type === 'direct' && chat.participantIds) {
            return chat.participantIds.find(id => id !== currentUserId) || null;
        }
        return null;
    };

    const getUserPresenceInfo = (userId: string | null) => {
        if (!userId || !userPresence[userId]) {
            return null;
        }
        return userPresence[userId];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Messages</h2>
                    <button
                        onClick={onNewMessage}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="New Message"
                    >
                        <Plus className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {chats.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        <p>No conversations yet</p>
                        <button
                            onClick={onNewMessage}
                            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                        >
                            Start a new conversation
                        </button>
                    </div>
                ) : (
                    chats.map((chat) => {
                        const isSelected = chat.id === selectedChatId;
                        const displayName = getChatDisplayName(chat);
                        const otherUserId = getOtherParticipantId(chat);
                        const presenceInfo = getUserPresenceInfo(otherUserId);

                        return (
                            <div
                                key={chat.id}
                                onClick={() => onSelectChat(chat.id, displayName)}
                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Icon with online indicator */}
                                    <div className="relative">
                                        <div className={`p-2 rounded-full ${chat.type === 'group' ? 'bg-purple-100' : 'bg-blue-100'
                                            }`}>
                                            {chat.type === 'group' ? (
                                                <Users className="w-5 h-5 text-purple-600" />
                                            ) : (
                                                <MessageCircle className="w-5 h-5 text-blue-600" />
                                            )}
                                        </div>
                                        {/* Online status indicator for direct chats */}
                                        {chat.type === 'direct' && presenceInfo && (
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${presenceInfo.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                                                }`} />
                                        )}
                                    </div>

                                    {/* Chat Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-medium text-gray-900 truncate">
                                                {displayName}
                                            </h3>
                                            {chat.lastMessageTime && (
                                                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                                    {formatTime(chat.lastMessageTime)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Online status text for direct chats */}
                                        {chat.type === 'direct' && presenceInfo && (
                                            <div className="text-xs mb-1">
                                                {presenceInfo.status === 'online' ? (
                                                    <span className="text-green-600 font-medium">● Online</span>
                                                ) : (
                                                    <span className="text-gray-500">
                                                        Last seen {formatLastSeen(presenceInfo.lastSeen)}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {chat.lastMessage && (
                                            <p className="text-sm text-gray-600 truncate">
                                                {chat.lastMessageSender && chat.lastMessageSender !== 'You' ? (
                                                    <span className="font-medium">{chat.lastMessageSender}: </span>
                                                ) : null}
                                                {chat.lastMessage}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
