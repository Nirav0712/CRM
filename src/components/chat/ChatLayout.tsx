'use client';

import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import ConversationList from './ConversationList';
import MessageDisplay from './MessageDisplay';
import MessageInput from './MessageInput';
import UserSelector from './UserSelector';
import { ChatUser } from '@/types/chat';
import { updateUserPresence } from '@/lib/realtimeDb';

interface ChatLayoutProps {
    currentUserId: string;
    currentUserName: string;
    users: ChatUser[];
}

export default function ChatLayout({ currentUserId, currentUserName, users }: ChatLayoutProps) {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [selectedChatName, setSelectedChatName] = useState<string>('');
    const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);

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

    const handleSelectChat = (chatId: string, chatName: string) => {
        setSelectedChatId(chatId);
        setSelectedChatName(chatName);
    };

    const handleChatCreated = (chatId: string, chatName: string) => {
        setSelectedChatId(chatId);
        setSelectedChatName(chatName);
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
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-6 h-6 text-blue-600" />
                            <div>
                                <h2 className="font-semibold text-gray-900">{selectedChatName}</h2>
                                <p className="text-sm text-gray-500">
                                    {selectedChatId.startsWith('group/') ? 'Group Chat' : 'Direct Message'}
                                </p>
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
