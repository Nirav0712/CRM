import { realtimeDb } from './firebase';
import {
    ref,
    push,
    set,
    onValue,
    off,
    update,
    query,
    orderByChild,
    limitToLast,
    serverTimestamp,
    get,
    DataSnapshot
} from 'firebase/database';
import { Message, Chat, TypingIndicator } from '@/types/chat';

/**
 * Send a message to a chat
 */
export const sendMessage = async (
    chatId: string,
    senderId: string,
    senderName: string,
    text: string
): Promise<void> => {
    const messagesRef = ref(realtimeDb, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);

    const message = {
        senderId,
        senderName,
        text,
        timestamp: Date.now(),
        read: { [senderId]: true }
    };

    await set(newMessageRef, message);

    // Update last message in chat info
    const chatInfoRef = ref(realtimeDb, `chats/${chatId}/info`);
    await update(chatInfoRef, {
        lastMessage: text,
        lastMessageTime: Date.now(),
        lastMessageSender: senderName
    });
};

/**
 * Subscribe to messages in a chat
 */
export const subscribeToMessages = (
    chatId: string,
    callback: (messages: Message[]) => void
): (() => void) => {
    const messagesRef = ref(realtimeDb, `chats/${chatId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));

    const unsubscribe = onValue(messagesQuery, (snapshot: DataSnapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            messages.push({
                id: childSnapshot.key!,
                chatId,
                ...data
            });
        });
        callback(messages);
    });

    return () => off(messagesQuery);
};

/**
 * Mark messages as read for a user
 */
export const markMessagesAsRead = async (
    chatId: string,
    userId: string
): Promise<void> => {
    const messagesRef = ref(realtimeDb, `chats/${chatId}/messages`);
    const snapshot = await get(messagesRef);

    const updates: { [key: string]: any } = {};
    snapshot.forEach((childSnapshot) => {
        const messageId = childSnapshot.key;
        updates[`${messageId}/read/${userId}`] = true;
    });

    if (Object.keys(updates).length > 0) {
        await update(messagesRef, updates);
    }
};

/**
 * Update user presence (online/offline)
 */
export const updateUserPresence = async (
    userId: string,
    status: 'online' | 'offline'
): Promise<void> => {
    const presenceRef = ref(realtimeDb, `presence/${userId}`);
    await set(presenceRef, {
        status,
        lastSeen: Date.now()
    });
};

/**
 * Subscribe to user presence
 */
export const subscribeToPresence = (
    userId: string,
    callback: (status: 'online' | 'offline', lastSeen: number) => void
): (() => void) => {
    const presenceRef = ref(realtimeDb, `presence/${userId}`);

    const unsubscribe = onValue(presenceRef, (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        if (data) {
            callback(data.status, data.lastSeen);
        }
    });

    return () => off(presenceRef);
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
    const typingRef = ref(realtimeDb, `typing/${chatId}/${userId}`);

    if (isTyping) {
        await set(typingRef, {
            userName,
            timestamp: Date.now()
        });
    } else {
        await set(typingRef, null);
    }
};

/**
 * Subscribe to typing indicators
 */
export const subscribeToTyping = (
    chatId: string,
    currentUserId: string,
    callback: (typingUsers: TypingIndicator[]) => void
): (() => void) => {
    const typingRef = ref(realtimeDb, `typing/${chatId}`);

    const unsubscribe = onValue(typingRef, (snapshot: DataSnapshot) => {
        const typingUsers: TypingIndicator[] = [];
        snapshot.forEach((childSnapshot) => {
            const userId = childSnapshot.key!;
            if (userId !== currentUserId) {
                const data = childSnapshot.val();
                // Only consider as typing if timestamp is within last 5 seconds
                if (data && Date.now() - data.timestamp < 5000) {
                    typingUsers.push({
                        userId,
                        userName: data.userName,
                        timestamp: data.timestamp
                    });
                }
            }
        });
        callback(typingUsers);
    });

    return () => off(typingRef);
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
    // Create a consistent chat ID by sorting user IDs
    const chatId = [user1Id, user2Id].sort().join('_');
    const fullChatId = `direct/${chatId}`;

    const chatInfoRef = ref(realtimeDb, `chats/${fullChatId}/info`);
    const snapshot = await get(chatInfoRef);

    if (!snapshot.exists()) {
        // Create new chat
        await set(chatInfoRef, {
            type: 'direct',
            participantIds: [user1Id, user2Id],
            participantNames: {
                [user1Id]: user1Name,
                [user2Id]: user2Name
            },
            createdAt: Date.now()
        });
    }

    return fullChatId;
};

/**
 * Initialize group chat if it doesn't exist
 */
export const initializeGroupChat = async (): Promise<string> => {
    const chatId = 'group/office-all';
    const chatInfoRef = ref(realtimeDb, `chats/${chatId}/info`);
    const snapshot = await get(chatInfoRef);

    if (!snapshot.exists()) {
        await set(chatInfoRef, {
            type: 'group',
            name: 'All Office Members',
            createdAt: Date.now()
        });
    }

    return chatId;
};

/**
 * Get all chats for a user
 */
export const subscribeToUserChats = (
    userId: string,
    callback: (chats: Chat[]) => void
): (() => void) => {
    const chatsRef = ref(realtimeDb, 'chats');

    const unsubscribe = onValue(chatsRef, (snapshot: DataSnapshot) => {
        const chats: Chat[] = [];

        snapshot.forEach((typeSnapshot) => {
            const type = typeSnapshot.key as 'group' | 'direct';

            typeSnapshot.forEach((chatSnapshot) => {
                const chatId = `${type}/${chatSnapshot.key}`;
                const info = chatSnapshot.child('info').val();

                if (info) {
                    // Include group chats and direct chats where user is a participant
                    if (type === 'group' || (info.participantIds && info.participantIds.includes(userId))) {
                        chats.push({
                            id: chatId,
                            type,
                            name: info.name || info.participantNames?.[type === 'direct' ?
                                info.participantIds.find((id: string) => id !== userId) : ''] || 'Unknown',
                            participantIds: info.participantIds || [],
                            lastMessage: info.lastMessage,
                            lastMessageTime: info.lastMessageTime,
                            lastMessageSender: info.lastMessageSender
                        });
                    }
                }
            });
        });

        // Sort by last message time
        chats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        callback(chats);
    });

    return () => off(chatsRef);
};

/**
 * Get all chats (admin only)
 */
export const subscribeToAllChats = (
    callback: (chats: Chat[]) => void
): (() => void) => {
    const chatsRef = ref(realtimeDb, 'chats');

    const unsubscribe = onValue(chatsRef, (snapshot: DataSnapshot) => {
        const chats: Chat[] = [];

        snapshot.forEach((typeSnapshot) => {
            const type = typeSnapshot.key as 'group' | 'direct';

            typeSnapshot.forEach((chatSnapshot) => {
                const chatId = `${type}/${chatSnapshot.key}`;
                const info = chatSnapshot.child('info').val();

                if (info) {
                    chats.push({
                        id: chatId,
                        type,
                        name: info.name || 'Direct Chat',
                        participantIds: info.participantIds || [],
                        lastMessage: info.lastMessage,
                        lastMessageTime: info.lastMessageTime,
                        lastMessageSender: info.lastMessageSender
                    });
                }
            });
        });

        // Sort by last message time
        chats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        callback(chats);
    });

    return () => off(chatsRef);
};
