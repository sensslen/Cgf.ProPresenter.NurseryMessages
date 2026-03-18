import React, { useEffect, useState, useCallback, useRef } from 'react';
import { streamMessages, triggerMessage, clearMessage } from '../api/proPresenter';
import { Message, TriggerPayloadToken } from '../types/proPresenter';
import MessageItem from './MessageItem';
import { useTranslation } from 'react-i18next';
import { replaceAllTokens } from '../utils/tokenReplacement';

interface MessageListProps {
    url: string;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setConnectionError: React.Dispatch<React.SetStateAction<string | null>>;
    setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
}

const MessageList: React.FC<MessageListProps> = ({ url, setError, setConnectionError, setSuccess }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const { t } = useTranslation();
    const streamAbortRef = useRef<AbortController | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);

    // Memoized handlers to prevent stale closures
    const handleChunk = useCallback((data: Message[] | Message) => {
        if (Array.isArray(data)) {
            setMessages(data);
            return;
        }

        setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id.uuid === data.id.uuid);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = data;
                return copy;
            }
            return [...prev, data];
        });
    }, []);

    const handleOpen = useCallback(() => {
        setConnectionError(null);
        retryCountRef.current = 0; // Reset retry count on successful connection
    }, [setConnectionError]);

    // Implement retry/backoff for transient failures
    const attemptReconnect = useCallback((errorArg: unknown) => {
        // Calculate exponential backoff with jitter
        // Base delay: 1000ms, max delay: 30000ms
        const baseDelay = 1000;
        const maxDelay = 30000;
        const backoffDelay = Math.min(baseDelay * Math.pow(2, retryCountRef.current), maxDelay);
        const jitter = Math.random() * 0.3 * backoffDelay; // 0-30% jitter
        const totalDelay = backoffDelay + jitter;

        retryCountRef.current++;

        // Schedule reconnection attempt
        retryTimeoutRef.current = setTimeout(() => {
            // Trigger a reconnection by abort+retry (the effect will handle this)
            streamAbortRef.current?.abort();
        }, totalDelay);
    }, []);

    const handleClose = useCallback((): void => {
        // Stream closed - check if this was intentional (abort) or transient error
        // The effect will determine if reconnection is needed via URL changes
        // Abort-triggered closes are handled differently from natural closes
    }, []);

    const handleError = useCallback((err: unknown) => {
        // Error during streaming - set error and schedule reconnection with backoff
        setConnectionError(t('message-list.errors.failed-to-connect'));
        setMessages([]);
        console.error('Streaming error:', err);
        attemptReconnect(err);
    }, [t, setConnectionError, attemptReconnect]);

    // Stream messages from the server using the chunked endpoint
    useEffect(() => {
        if (!url) {
            setMessages([]);
            setConnectionError(null); // Clear error when URL is removed
            retryCountRef.current = 0;
            return;
        }

        // Clear previous messages while (re)connecting so UI only shows messages when connected
        setMessages([]);

        try {
            // Cancel any existing stream and retry timeout before starting a new one
            streamAbortRef.current?.abort();
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
            
            // streamMessages is now synchronous and returns the controller immediately
            // The async connection logic runs in the background
            streamAbortRef.current = streamMessages(url, handleChunk, handleOpen, handleClose, handleError);
        } catch (err) {
            handleError(err);
        }

        return () => {
            try {
                streamAbortRef.current?.abort();
            } catch (e) {
                // ignore
            }
            // Clean up any pending retry timeout
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, [url, handleChunk, handleOpen, handleClose, handleError]);
    
    const renderMessageWithTokens = (message: string, tokenValues: { [key: string]: string }): string => {
        return replaceAllTokens(message, tokenValues);
    };

    const handleShowMessage = async (message: Message, tokenValues: { [key: string]: string }) => {
        if (!url) return;

        const payload: TriggerPayloadToken[] = message.tokens.map((token) => {
            const tokenPayload: TriggerPayloadToken = { name: token.name };

            if (token.text) {
                tokenPayload.text = { text: tokenValues[token.name] || '' };
            }

            if (token.timer) {
                tokenPayload.timer = {
                    configuration: {
                        ...token.timer.configuration,
                    },
                    format: {
                        ...token.timer.format,
                    },
                };
            }

            if (token.clock) {
                tokenPayload.clock = token.clock;
            }

            return tokenPayload;
        });

        try {
            await triggerMessage(url, message.id.uuid, payload);
            setError(null); // Clear previous errors
            const formattedMessage = renderMessageWithTokens(message.message, tokenValues);
            setSuccess(t('message-list.success.message-shown-with-details', { message: formattedMessage })); // Set the success message
        } catch (error) {
            if (error instanceof Error) {
                setError(t('message-list.errors.failed-to-show'));
                console.error('Error triggering message:', error.message);
            } else {
                setError(t("message-list.errors.unknown-error", { error }));
                console.error('Unexpected error:', error);
            }
        }
    };

    // Handler for hiding a message (to be implemented)
    const handleHideMessage = async (message: Message) => {
        if (!url) return;
        try {
            await clearMessage(url, message.id.uuid);
            setError(null);
            setSuccess(t('message-list.success.message-hidden', { message: message.message }));
        } catch (error) {
            if (error instanceof Error) {
                setError(t('message-list.errors.failed-to-hide'));
                console.error('Error hiding message:', error.message);
            } else {
                setError(t('message-list.errors.unknown-error', { error }));
                console.error('Unexpected error:', error);
            }
        }
    };

    return (
        <div>
            {messages.length > 0 && (
                <ul>
                    {messages.map((message) => (
                        <MessageItem
                            key={message.id.uuid}
                            message={message}
                            onShowMessage={handleShowMessage}
                            onHideMessage={handleHideMessage}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MessageList;
