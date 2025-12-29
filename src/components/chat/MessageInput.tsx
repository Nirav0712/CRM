'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { sendMessage, updateTypingStatus } from '@/lib/realtimeDb';

interface MessageInputProps {
    chatId: string | null;
    currentUserId: string;
    currentUserName: string;
    currentUserRole?: string;
}

export default function MessageInput({ chatId, currentUserId, currentUserName, currentUserRole }: MessageInputProps) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clean up typing indicator when component unmounts or chat changes
    useEffect(() => {
        return () => {
            if (chatId && isTyping) {
                updateTypingStatus(chatId, currentUserId, currentUserName, false);
            }
        };
    }, [chatId, currentUserId, currentUserName, isTyping]);

    const handleTyping = (value: string) => {
        setText(value);

        if (!chatId) return;

        // Set typing indicator
        if (!isTyping && value.trim()) {
            setIsTyping(true);
            updateTypingStatus(chatId, currentUserId, currentUserName, true);
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to clear typing indicator
        if (value.trim()) {
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                updateTypingStatus(chatId, currentUserId, currentUserName, false);
            }, 3000);
        } else {
            setIsTyping(false);
            updateTypingStatus(chatId, currentUserId, currentUserName, false);
        }
    };

    const handleSend = async () => {
        if (!chatId || !text.trim() || sending) return;

        const messageText = text.trim();
        setText('');
        setSending(true);

        // Clear typing indicator
        if (isTyping) {
            setIsTyping(false);
            updateTypingStatus(chatId, currentUserId, currentUserName, false);
        }

        try {
            await sendMessage(chatId, currentUserId, currentUserName, messageText, currentUserRole);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
            setText(messageText); // Restore the message
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t bg-white p-4">
            <div className="flex items-end gap-2">
                <textarea
                    value={text}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={chatId ? "Type a message..." : "Select a chat to start messaging"}
                    disabled={!chatId || sending}
                    rows={1}
                    className="flex-1 resize-none border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed max-h-32"
                    style={{ minHeight: '40px' }}
                />
                <button
                    onClick={handleSend}
                    disabled={!chatId || !text.trim() || sending}
                    className="bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    title="Send message (Enter)"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
            </p>
        </div>
    );
}
