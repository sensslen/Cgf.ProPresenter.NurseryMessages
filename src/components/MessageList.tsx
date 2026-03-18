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
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryCountRef = useRef(0);
    const isRetryRef = useRef(false); // Track if current connection attempt is a retry

    // Refs to store the latest callback versions to break circular dependency
    const latestHandleErrorRef = useRef<(err: unknown) => void>(() => {});
    const latestAttemptReconnectRef = useRef<(errorArg: unknown) => void>(() => {});
    const latestEstablishConnectionRef = useRef<(isRetry: boolean) => void>(() => {});

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
        isRetryRef.current = false;
    }, [setConnectionError]);

    const handleClose = useCallback((): void => {
        // Stream closed naturally - treat as transient and schedule reconnect
        // Check if this was an abort (user/code explicitly cancelled) or natural close
        // If not aborted, attempt to reconnect
        if (streamAbortRef.current && !streamAbortRef.current.signal.aborted) {
            // Clean close without abort - trigger reconnect
            latestAttemptReconnectRef.current(new Error('Stream closed unexpectedly'));
        }
    }, []);

    // Establish or re-establish the stream connection
    // No dependencies on handleError/attemptReconnect - calls via refs instead
    const establishConnection = useCallback((isRetry: boolean) => {
        if (!url) return;

        // Only clear messages on initial connection, not on retries
        if (!isRetry) {
            setMessages([]);
        }

        try {
            // Cancel any existing stream before starting a new one
            streamAbortRef.current?.abort();
            
            // streamMessages is now synchronous and returns the controller immediately
            // The async connection logic runs in the background
            // Use refs for callbacks to avoid circular dependency
            streamAbortRef.current = streamMessages(url, handleChunk, handleOpen, handleClose, (err) => {
                latestHandleErrorRef.current(err);
            });
        } catch (err) {
            latestHandleErrorRef.current(err);
        }
    }, [url, handleChunk, handleOpen, handleClose]);

    // Implement retry/backoff for transient failures
    // No dependency on establishConnection - calls via ref instead
    const attemptReconnect = useCallback((_errorArg: unknown) => {
        // Clear any existing pending retry to prevent overlapping reconnection attempts
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        
        // Calculate exponential backoff with jitter
        // Base delay: 1000ms, max delay: 30000ms
        const baseDelay = 1000;
        const maxDelay = 30000;
        const backoffDelay = Math.min(baseDelay * Math.pow(2, retryCountRef.current), maxDelay);
        const jitter = Math.random() * 0.3 * backoffDelay; // 0-30% jitter
        const totalDelay = backoffDelay + jitter;

        retryCountRef.current++;

        // Schedule reconnection attempt using ref to avoid circular dependency
        retryTimeoutRef.current = setTimeout(() => {
            isRetryRef.current = true;
            latestEstablishConnectionRef.current(true); // Reconnect without clearing messages
        }, totalDelay);
    }, []);

    // Handle errors with reconnection backoff
    // No dependency on attemptReconnect - calls via ref instead
    const handleError = useCallback((err: unknown) => {
        // Check if this is a validation error (deterministic, not transient)
        const isValidationError = 
            (err instanceof Error && err.message.includes('Invalid URL format')) ||
            (err instanceof Error && err.message.includes('validation'));
        
        if (isValidationError) {
            // Validation errors are deterministic - don't reconnect, wait for user correction
            setConnectionError(t('message-list.errors.failed-to-connect'));
            console.error('Validation error:', err);
        } else {
            // All other errors are transient - set error and schedule reconnection with backoff
            setConnectionError(t('message-list.errors.failed-to-connect'));
            console.error('Streaming error:', err);
            latestAttemptReconnectRef.current(err);
        }
    }, [t, setConnectionError]);

    // Update refs with the latest callback implementations
    // This effect captures the current versions without creating circular dependencies
    useEffect(() => {
        latestHandleErrorRef.current = handleError;
        latestAttemptReconnectRef.current = attemptReconnect;
        latestEstablishConnectionRef.current = establishConnection;
    }, [handleError, attemptReconnect, establishConnection]);

    // Stream messages from the server using the chunked endpoint
    useEffect(() => {
        if (!url) {
            setMessages([]);
            setConnectionError(null); // Clear error when URL is removed
            retryCountRef.current = 0;
            isRetryRef.current = false;
            return;
        }

        // Reset retry state when handling a new URL to treat it as a fresh connection
        isRetryRef.current = false;
        retryCountRef.current = 0;

        // Establish initial connection using the latest ref version
        // Call via ref to avoid circular dependency issues
        latestEstablishConnectionRef.current(isRetryRef.current);

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
    }, [url, setConnectionError]);
    
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
