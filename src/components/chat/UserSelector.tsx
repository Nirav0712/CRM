'use client';

import { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import { ChatUser } from '@/types/chat';
import { getOrCreateDirectChat } from '@/lib/realtimeDb';

interface UserSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string;
    currentUserName: string;
    users: ChatUser[];
    onChatCreated: (chatId: string, chatName: string) => void;
}

export default function UserSelector({
    isOpen,
    onClose,
    currentUserId,
    currentUserName,
    users,
    onChatCreated
}: UserSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [creating, setCreating] = useState(false);

    const filteredUsers = users.filter(user =>
        user.id !== currentUserId &&
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelectUser = async (user: ChatUser) => {
        setCreating(true);
        try {
            const chatId = await getOrCreateDirectChat(
                currentUserId,
                user.id,
                currentUserName,
                user.name
            );
            onChatCreated(chatId, user.name);
            onClose();
            setSearchQuery('');
        } catch (error) {
            console.error('Error creating chat:', error);
            alert('Failed to create chat. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">New Message</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={creating}
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {searchQuery ? 'No users found' : 'No users available'}
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => !creating && handleSelectUser(user)}
                                className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${creating ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-gray-900 truncate">
                                                {user.name}
                                            </h4>
                                            {user.isOnline && (
                                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {creating && (
                    <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-600">
                        Creating conversation...
                    </div>
                )}
            </div>
        </div>
    );
}
