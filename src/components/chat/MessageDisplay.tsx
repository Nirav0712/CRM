'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCheck, Check, Shield, UserCircle } from 'lucide-react';
import { Message, TypingIndicator } from '@/types/chat';
import { subscribeToMessages, subscribeToTyping, markMessagesAsRead } from '@/lib/realtimeDb';
import { notifyNewMessage } from '@/lib/notifications';

interface MessageDisplayProps {
    chatId: string | null;
    currentUserId: string;
    currentUserName: string;
}

export default function MessageDisplay({ chatId, currentUserId, currentUserName }: MessageDisplayProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const previousMessagesRef = useRef<Message[]>([]);

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            previousMessagesRef.current = [];
            return;
        }

        setLoading(true);

        // Subscribe to messages
        const unsubscribeMessages = subscribeToMessages(chatId, (newMessages) => {
            // Check for new messages to trigger notifications
            if (previousMessagesRef.current.length > 0) {
                const newMessagesList = newMessages.filter(msg =>
                    !previousMessagesRef.current.some(prevMsg => prevMsg.id === msg.id)
                );

                // Notify for messages not sent by current user
                newMessagesList.forEach(msg => {
                    if (msg.senderId !== currentUserId) {
                        const isGroupChat = chatId.startsWith('group/');
                        const priority = msg.senderRole === 'ADMIN' ? 'high' : 'normal';
                        notifyNewMessage(
                            msg.senderName,
                            msg.text,
                            chatId,
                            msg.senderId,
                            isGroupChat,
                            priority
                        );
                    }
                });
            }

            previousMessagesRef.current = newMessages;
            setMessages(newMessages);
            setLoading(false);

            // Mark only unread messages as read (prevent continuous updates)
            const unreadMessages = newMessages.filter(msg =>
                msg.senderId !== currentUserId && // Not sent by current user
                (!msg.readBy || !msg.readBy[currentUserId]) // Not already read
            );

            if (unreadMessages.length > 0) {
                markMessagesAsRead(chatId, currentUserId);
            }
        });

        // Subscribe to typing indicators
        const unsubscribeTyping = subscribeToTyping(chatId, currentUserId, (users) => {
            setTypingUsers(users);
        });

        return () => {
            unsubscribeMessages();
            unsubscribeTyping();
        };
    }, [chatId, currentUserId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!chatId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm mt-1">Choose a chat from the list to start messaging</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2">Loading messages...</p>
                </div>
            </div>
        );
    }

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
                date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
    };

    const getReadStatus = (message: Message) => {
        if (!message.readBy) return { isRead: false, readCount: 0 };

        const readByUsers = Object.keys(message.readBy).filter(userId => userId !== message.senderId);
        return {
            isRead: readByUsers.length > 0,
            readCount: readByUsers.length
        };
    };

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isSent = message.senderId === currentUserId;
                        const readStatus = getReadStatus(message);
                        const isAdmin = message.senderRole === 'ADMIN';

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
                                    {!isSent && (
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <UserCircle className="w-4 h-4 text-gray-500" />
                                            <span className="text-xs font-medium text-gray-700">
                                                {message.senderName}
                                            </span>
                                            {isAdmin && (
                                                <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                    <Shield className="w-3 h-3" />
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div
                                        className={`rounded-lg px-4 py-2 ${isSent
                                            ? isAdmin
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 px-1">
                                        <span className="text-xs text-gray-500">
                                            {formatTime(message.timestamp)}
                                        </span>
                                        {isSent && (
                                            <span className="flex items-center gap-1">
                                                {readStatus.isRead ? (
                                                    <span title={`Read by ${readStatus.readCount} ${readStatus.readCount === 1 ? 'person' : 'people'}`}>
                                                        <CheckCheck className="w-4 h-4 text-blue-600" />
                                                    </span>
                                                ) : (
                                                    <span title="Sent">
                                                        <Check className="w-4 h-4 text-gray-400" />
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                            <p className="text-sm text-gray-600">
                                {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </p>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
