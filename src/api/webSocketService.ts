// WebSocket service for ProPresenter real-time updates
import { Message } from '../types/proPresenter';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketServiceOptions {
    url: string;
    onMessage: (messages: Message[]) => void;
    onStatusChange: (status: WebSocketStatus) => void;
    onError: (error: Error) => void;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export class WebSocketService {
    private ws: WebSocket | null = null;
    private options: WebSocketServiceOptions;
    private reconnectAttempts = 0;
    private reconnectTimer: number | null = null;
    private isIntentionallyClosed = false;
    private readonly maxReconnectAttempts: number;
    private readonly reconnectInterval: number;

    constructor(options: WebSocketServiceOptions) {
        this.options = options;
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
        this.reconnectInterval = options.reconnectInterval ?? 3000;
    }

    /**
     * Convert HTTP(S) URL to WebSocket URL
     */
    private convertToWebSocketUrl(httpUrl: string): string {
        try {
            const url = new URL(httpUrl);
            // Convert http:// to ws:// and https:// to wss://
            url.protocol = url.protocol.replace('http', 'ws');
            // ProPresenter WebSocket endpoint pattern
            url.pathname = '/v1/messages/updates';
            return url.toString();
        } catch {
            throw new Error(`Invalid URL format: ${httpUrl}`);
        }
    }

    /**
     * Connect to the WebSocket server
     */
    connect(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        this.isIntentionallyClosed = false;

        try {
            const wsUrl = this.convertToWebSocketUrl(this.options.url);
            console.log(`Connecting to WebSocket: ${wsUrl}`);
            
            this.options.onStatusChange('connecting');
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected successfully');
                this.options.onStatusChange('connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Handle different message formats from ProPresenter
                    if (Array.isArray(data)) {
                        this.options.onMessage(data);
                    } else if (data.messages) {
                        this.options.onMessage(data.messages);
                    } else {
                        console.warn('Unexpected WebSocket message format:', data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    this.options.onError(new Error('Failed to parse WebSocket message'));
                }
            };

            this.ws.onerror = () => {
                console.error('WebSocket error occurred');
                this.options.onStatusChange('error');
                this.options.onError(new Error('WebSocket connection error'));
            };

            this.ws.onclose = (event) => {
                console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
                this.options.onStatusChange('disconnected');
                this.ws = null;

                // Attempt to reconnect if not intentionally closed
                if (!this.isIntentionallyClosed) {
                    this.scheduleReconnect();
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.options.onStatusChange('error');
            this.options.onError(error instanceof Error ? error : new Error('Unknown WebSocket error'));
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule a reconnection attempt
     */
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
            this.options.onError(new Error('WebSocket reconnection failed after maximum attempts'));
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
        
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(() => {
            console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.connect();
        }, delay);
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect(): void {
        this.isIntentionallyClosed = true;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.reconnectAttempts = 0;
        this.options.onStatusChange('disconnected');
    }

    /**
     * Check if WebSocket is currently connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get current connection status
     */
    getStatus(): WebSocketStatus {
        if (!this.ws) return 'disconnected';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.OPEN:
                return 'connected';
            case WebSocket.CLOSING:
            case WebSocket.CLOSED:
                return 'disconnected';
            default:
                return 'disconnected';
        }
    }
}
