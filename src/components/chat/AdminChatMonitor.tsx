'use client';

import { useState, useEffect } from 'react';
import { Shield, Search, MessageCircle, Users, X } from 'lucide-react';
import { Chat, Message, ChatUser } from '@/types/chat';
import { subscribeToAllChats, subscribeToMessages } from '@/lib/realtimeDb';

interface AdminChatMonitorProps {
    users: ChatUser[];
}

export default function AdminChatMonitor({ users }: AdminChatMonitorProps) {
    const [allChats, setAllChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToAllChats((chats) => {
            setAllChats(chats);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!selectedChatId) {
            setMessages([]);
            return;
        }

        const unsubscribe = subscribeToMessages(selectedChatId, (chatMessages) => {
            setMessages(chatMessages);
        });

        return () => unsubscribe();
    }, [selectedChatId]);

    const getUserName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user?.name || 'Unknown User';
    };

    const getChatDisplayInfo = (chat: Chat) => {
        if (chat.type === 'group') {
            return {
                name: chat.name || 'Group Chat',
                participants: 'All Office Members'
            };
        } else {
            const participantNames = chat.participantIds.map(id => getUserName(id)).join(' & ');
            return {
                name: participantNames || 'Direct Chat',
                participants: `${chat.participantIds.length} participants`
            };
        }
    };

    const filteredChats = allChats.filter(chat => {
        const displayInfo = getChatDisplayInfo(chat);
        return displayInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
                date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
    };

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6">
            {/* Admin Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-600 rounded-lg">
                    <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Admin Chat Monitor</h2>
                    <p className="text-sm text-gray-600">View all user conversations</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="flex h-[600px]">
                    {/* Left: Chat List */}
                    <div className="w-96 border-r flex flex-col">
                        {/* Search */}
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search conversations..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        {/* Chat List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                </div>
                            ) : filteredChats.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                                </div>
                            ) : (
                                filteredChats.map((chat) => {
                                    const displayInfo = getChatDisplayInfo(chat);
                                    const isSelected = chat.id === selectedChatId;

                                    return (
                                        <div
                                            key={chat.id}
                                            onClick={() => setSelectedChatId(chat.id)}
                                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-purple-50 border-l-4 border-l-purple-600' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-full ${chat.type === 'group' ? 'bg-purple-100' : 'bg-blue-100'
                                                    }`}>
                                                    {chat.type === 'group' ? (
                                                        <Users className="w-5 h-5 text-purple-600" />
                                                    ) : (
                                                        <MessageCircle className="w-5 h-5 text-blue-600" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="font-medium text-gray-900 truncate">
                                                            {displayInfo.name}
                                                        </h3>
                                                        {chat.lastMessageTime && (
                                                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                                                {formatTime(chat.lastMessageTime)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-1">{displayInfo.participants}</p>
                                                    {chat.lastMessage && (
                                                        <p className="text-sm text-gray-600 truncate">
                                                            {chat.lastMessageSender}: {chat.lastMessage}
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

                    {/* Right: Message View */}
                    <div className="flex-1 flex flex-col">
                        {selectedChatId ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {getChatDisplayInfo(allChats.find(c => c.id === selectedChatId)!).name}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {selectedChatId.startsWith('group/') ? 'Group Chat' : 'Direct Message'} • Read-only mode
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedChatId(null)}
                                            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5 text-gray-600" />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                                    {messages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            <p>No messages in this conversation</p>
                                        </div>
                                    ) : (
                                        messages.map((message) => (
                                            <div key={message.id} className="flex justify-start">
                                                <div className="max-w-[70%]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-gray-700">
                                                            {message.senderName}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatTime(message.timestamp)}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                                                        <p className="whitespace-pre-wrap break-words text-gray-900">
                                                            {message.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Read-only Notice */}
                                <div className="p-3 bg-purple-50 border-t">
                                    <p className="text-sm text-purple-900 text-center">
                                        <Shield className="w-4 h-4 inline mr-2" />
                                        Admin monitoring mode - Messages are read-only
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center bg-gray-50">
                                <div className="text-center text-gray-500">
                                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">Select a conversation</p>
                                    <p className="text-sm mt-1">Choose from the list to view messages</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
