// React hook for managing ProPresenter connection with WebSocket and polling fallback
/* eslint-disable react-hooks/set-state-in-effect */
// Note: We intentionally call setState within effects to synchronize with external systems (WebSocket and polling)
import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '../types/proPresenter';
import { getMessages } from '../api/proPresenter';
import { WebSocketService, WebSocketStatus } from '../api/webSocketService';

export interface UseProPresenterConnectionOptions {
    url: string;
    pollingInterval?: number;
    enableWebSocket?: boolean;
    onError?: (error: Error) => void;
}

export interface UseProPresenterConnectionResult {
    messages: Message[];
    connectionStatus: 'websocket' | 'polling' | 'disconnected';
    webSocketStatus: WebSocketStatus;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Custom hook to manage ProPresenter connection
 * Attempts WebSocket connection first, falls back to polling if WebSocket fails
 */
export const useProPresenterConnection = (
    options: UseProPresenterConnectionOptions
): UseProPresenterConnectionResult => {
    const { url, pollingInterval = 1000, enableWebSocket = true, onError } = options;

    const [messages, setMessages] = useState<Message[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'websocket' | 'polling' | 'disconnected'>('disconnected');
    const [webSocketStatus, setWebSocketStatus] = useState<WebSocketStatus>('disconnected');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [shouldPoll, setShouldPoll] = useState<boolean>(false);

    const webSocketServiceRef = useRef<WebSocketService | null>(null);
    const webSocketFailedRef = useRef<boolean>(false);
    const isInitializedRef = useRef<boolean>(false);

    // Fetch messages via polling
    const fetchMessagesViaPolling = useCallback(async () => {
        if (!url) {
            return;
        }

        try {
            const data = await getMessages(url);
            setMessages(data);
            setError(null);
            setIsLoading(false);
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Failed to fetch messages');
            setError(errorObj);
            setIsLoading(false);
            if (onError) {
                onError(errorObj);
            }
        }
    }, [url, onError]);

    // Effect to manage polling when enabled
    useEffect(() => {
        if (!shouldPoll || !url) {
            return;
        }

        console.log('Starting polling mode');

        // Fetch immediately
        fetchMessagesViaPolling();

        // Then poll at regular intervals
        const intervalId = setInterval(() => {
            fetchMessagesViaPolling();
        }, pollingInterval);

        return () => {
            console.log('Stopping polling');
            clearInterval(intervalId);
        };
    }, [shouldPoll, url, pollingInterval, fetchMessagesViaPolling]);

    // Initialize WebSocket connection
    useEffect(() => {
        if (!url) {
            setConnectionStatus('disconnected');
            setShouldPoll(false);
            return;
        }

        if (!enableWebSocket || webSocketFailedRef.current) {
            // If WebSocket is disabled or already failed, enable polling
            setConnectionStatus('polling');
            setShouldPoll(true);
            return;
        }

        // Prevent multiple initializations
        if (isInitializedRef.current) {
            return;
        }
        isInitializedRef.current = true;

        console.log('Attempting WebSocket connection');

        // Create WebSocket service
        webSocketServiceRef.current = new WebSocketService({
            url,
            onMessage: (newMessages) => {
                setMessages(newMessages);
                setError(null);
                setIsLoading(false);
            },
            onStatusChange: (status) => {
                setWebSocketStatus(status);
                
                if (status === 'connected') {
                    setConnectionStatus('websocket');
                    setIsLoading(false);
                    // Disable polling when WebSocket is connected
                    setShouldPoll(false);
                } else if (status === 'error' || status === 'disconnected') {
                    // Don't immediately switch to polling; wait for reconnection attempts
                    if (webSocketFailedRef.current) {
                        setConnectionStatus('polling');
                        setShouldPoll(true);
                    }
                }
            },
            onError: (err) => {
                console.error('WebSocket error, will attempt fallback:', err);
                setError(err);
                
                // Mark WebSocket as failed and fall back to polling
                webSocketFailedRef.current = true;
                setConnectionStatus('polling');
                setShouldPoll(true);
                
                if (onError) {
                    onError(err);
                }
            },
            reconnectInterval: 3000,
            maxReconnectAttempts: 3, // Limited attempts before falling back to polling
        });

        // Attempt to connect
        webSocketServiceRef.current.connect();

        // Cleanup on unmount or URL change
        return () => {
            if (webSocketServiceRef.current) {
                webSocketServiceRef.current.disconnect();
                webSocketServiceRef.current = null;
            }
            isInitializedRef.current = false;
            webSocketFailedRef.current = false;
        };
    }, [url, enableWebSocket, onError]);

    return {
        messages,
        connectionStatus,
        webSocketStatus,
        isLoading,
        error,
    };
};
