import { Message, Chat, TypingIndicator } from '@/types/chat';

/**
 * Send a message to a chat
 */
export const sendMessage = async (
    chatId: string,
    senderId: string,
    senderName: string,
    text: string,
    senderRole?: string
): Promise<void> => {
    const response = await fetch(`/api/chat/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, senderName, senderRole })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
    }
};

/**
 * Subscribe to messages in a chat (using polling)
 */
export const subscribeToMessages = (
    chatId: string,
    callback: (messages: Message[]) => void
): (() => void) => {
    const fetchMessages = async () => {
        try {
            const response = await fetch(`/api/chat/chats/${chatId}/messages`);
            if (response.ok) {
                const messages = await response.json();
                callback(messages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);

    return () => clearInterval(interval);
};

/**
 * Mark messages as read for a user
 */
export const markMessagesAsRead = async (
    chatId: string,
    userId: string
): Promise<void> => {
    // This is currently handled by the sender/fetcher logic in Frontend
    // In MySQL we can implement a specific route if needed.
    // For now we'll just ignore or implementation a PUT to messages.
};

/**
 * Update user presence (online/offline)
 */
export const updateUserPresence = async (
    userId: string,
    status: 'online' | 'offline'
): Promise<void> => {
    await fetch('/api/chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
};

/**
 * Subscribe to user presence
 */
export const subscribeToPresence = (
    userId: string,
    callback: (status: 'online' | 'offline', lastSeen: number) => void
): (() => void) => {
    const fetchPresence = async () => {
        try {
            const response = await fetch(`/api/chat/presence?userIds=${userId}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    callback(data[0].status, data[0].lastSeen);
                }
            }
        } catch (error) {
            console.error('Error fetching presence:', error);
        }
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 10000);

    return () => clearInterval(interval);
};

/**
 * Update typing status
 */
export const updateTypingStatus = async (
    chatId: string,
    userId: string,
    userName: string,
    isTyping: boolean
): Promise<void> => {
    await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, userName, isTyping })
    });
};

/**
 * Subscribe to typing indicators
 */
export const subscribeToTyping = (
    chatId: string,
    currentUserId: string,
    callback: (typingUsers: TypingIndicator[]) => void
): (() => void) => {
    const fetchTyping = async () => {
        try {
            const response = await fetch(`/api/chat/typing?chatId=${chatId}`);
            if (response.ok) {
                const data = await response.json();
                // Filter out current user
                const typingUsers = data.filter((u: any) => u.userId !== currentUserId);
                callback(typingUsers);
            }
        } catch (error) {
            console.error('Error fetching typing status:', error);
        }
    };

    fetchTyping();
    const interval = setInterval(fetchTyping, 3000);

    return () => clearInterval(interval);
};

/**
 * Get or create a direct chat between two users
 */
export const getOrCreateDirectChat = async (
    user1Id: string,
    user2Id: string,
    user1Name: string,
    user2Name: string
): Promise<string> => {
    const response = await fetch('/api/chat/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'direct',
            participantIds: [user1Id, user2Id]
        })
    });

    if (!response.ok) {
        throw new Error('Failed to get or create chat');
    }

    const chat = await response.json();
    return chat.id;
};

/**
 * Initialize group chat if it doesn't exist
 */
export const initializeGroupChat = async (): Promise<string> => {
    // In MySQL we just expect group/office-all to exist or we handle it on server
    return 'group/office-all';
};

/**
 * Get all chats for a user
 */
export const subscribeToUserChats = (
    userId: string,
    callback: (chats: Chat[]) => void
): (() => void) => {
    const fetchChats = async () => {
        try {
            const response = await fetch('/api/chat/chats');
            if (response.ok) {
                const chats = await response.json();
                callback(chats);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        }
    };

    fetchChats();
    const interval = setInterval(fetchChats, 60000);

    return () => clearInterval(interval);
};

/**
 * Get all chats (admin only)
 */
export const subscribeToAllChats = (
    callback: (chats: Chat[]) => void
): (() => void) => {
    const fetchAllChats = async () => {
        try {
            const response = await fetch('/api/chat/chats');
            if (response.ok) {
                const chats = await response.json();
                callback(chats);
            }
        } catch (error) {
            console.error('Error fetching all chats:', error);
        }
    };

    fetchAllChats();
    const interval = setInterval(fetchAllChats, 60000);

    return () => clearInterval(interval);
};
