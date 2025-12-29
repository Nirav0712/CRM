export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    senderRole?: string;
    text: string;
    timestamp: number;
    read: { [userId: string]: boolean };
    readBy?: { [userId: string]: number }; // userId -> timestamp when read
}

export interface Chat {
    id: string;
    type: 'group' | 'direct';
    name?: string;
    participantIds: string[];
    lastMessage?: string;
    lastMessageTime?: number;
    lastMessageSender?: string;
}

export interface UserPresence {
    userId: string;
    status: 'online' | 'offline';
    lastSeen: number;
}

export interface TypingIndicator {
    userId: string;
    userName: string;
    timestamp: number;
}

export interface ChatUser {
    id: string;
    name: string;
    email: string;
    role: string;
    isOnline?: boolean;
}
