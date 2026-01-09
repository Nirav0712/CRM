// Firebase Cloud Messaging Service Worker
// This file must be in the public folder to have proper scope

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyD_ubZeiBnBREANxHy5maYkxp4-psF36ts",
    authDomain: "office-crm-f7fa3.firebaseapp.com",
    projectId: "office-crm-f7fa3",
    storageBucket: "office-crm-f7fa3.firebasestorage.app",
    messagingSenderId: "576369700038",
    appId: "1:576369700038:web:f11884fd6879905be7bbc7",
    databaseURL: "https://office-crm-f7fa3-default-rtdb.firebaseio.com"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
            url: payload.data?.url || '/dashboard/chat',
            chatId: payload.data?.chatId,
            senderId: payload.data?.senderId
        },
        tag: payload.data?.chatId || 'chat-notification',
        requireInteraction: payload.data?.priority === 'high',
        actions: [
            {
                action: 'open',
                title: 'Open Chat'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Open the app or focus existing window
    const urlToOpen = event.notification.data?.url || '/dashboard/chat';
    const chatId = event.notification.data?.chatId;
    const fullUrl = chatId ? `${urlToOpen}?openChat=${chatId}` : urlToOpen;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url.includes('/dashboard/chat') && 'focus' in client) {
                        return client.focus().then(() => {
                            // Send message to focused client to open specific chat
                            if (chatId) {
                                client.postMessage({
                                    type: 'OPEN_CHAT',
                                    chatId: chatId
                                });
                            }
                        });
                    }
                }
                // If no window is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(fullUrl);
                }
            })
    );
});
