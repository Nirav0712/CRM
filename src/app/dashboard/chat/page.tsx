'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatLayout from '@/components/chat/ChatLayout';
import AdminChatMonitor from '@/components/chat/AdminChatMonitor';
import { ChatUser } from '@/types/chat';

export default function ChatPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/chat/users');
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data.users);
                }
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        };

        if (session?.user) {
            fetchUsers();
        }
    }, [session]);

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading chat...</p>
                </div>
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    const isAdmin = session.user.role === 'ADMIN';

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
                <p className="text-gray-600 mt-1">
                    {isAdmin
                        ? 'Communicate with your team and monitor all conversations'
                        : 'Communicate with your team members'}
                </p>
            </div>

            {/* Regular Chat Interface */}
            <div className="mb-8">
                <ChatLayout
                    currentUserId={session.user.id}
                    currentUserName={session.user.name}
                    users={users}
                />
            </div>

            {/* Admin Monitor - Only visible to admins */}
            {isAdmin && (
                <div className="mt-8">
                    <AdminChatMonitor users={users} />
                </div>
            )}
        </div>
    );
}
