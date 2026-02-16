import { useEffect, useRef, useState } from 'react';

const getSocketUrl = () => {
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    return `${protocol}//${host}:3001/ws`;
};

export const useWebSocket = (clientId) => {
    const [lastMessage, setLastMessage] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        // Generate a random client ID if not provided
        const id = clientId || Math.random().toString(36).substring(7);
        const url = `${getSocketUrl()}/${id}`;

        console.log("🔌 Connecting to WS:", url);
        const ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => console.log('✅ WS Connected');
        ws.onclose = () => console.log('❌ WS Disconnected');
        ws.onerror = (e) => console.error('⚠️ WS Error', e);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // console.log("📩 WS Message:", data); 
                setLastMessage(data);
            } catch (e) {
                console.error("Failed to parse WS message", event.data);
            }
        };

        return () => {
            if (ws.readyState === 1) {
                ws.close();
            }
        };
    }, [clientId]);

    return { lastMessage };
};
