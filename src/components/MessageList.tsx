import React, { useEffect, useState, useCallback, useRef } from 'react';
import { streamMessages, triggerMessage, clearMessage } from '../api/proPresenter';
import { Message, TriggerPayloadToken } from '../types/proPresenter';
import MessageItem from './MessageItem';
import { useTranslation } from 'react-i18next';

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
    }, [setConnectionError]);

    const handleClose = useCallback(() => {
        // Stream closed normally - don't treat as error if we have messages
        // Only clear if absolutely necessary; messages already exist
    }, []);

    const handleError = useCallback((err: unknown) => {
        setConnectionError(t('message-list.errors.failed-to-connect'));
        setMessages([]);
        console.error('Streaming error:', err);
    }, [t, setConnectionError]);

    // Stream messages from the server using the chunked endpoint
    useEffect(() => {
        if (!url) {
            setMessages([]);
            return;
        }

        // Clear previous messages while (re)connecting so UI only shows messages when connected
        setMessages([]);

        (async () => {
            try {
                // Cancel any existing stream before starting a new one
                streamAbortRef.current?.abort();
                streamAbortRef.current = await streamMessages(url, handleChunk, handleOpen, handleClose, handleError);
            } catch (err) {
                handleError(err);
            }
        })();

        return () => {
            try {
                streamAbortRef.current?.abort();
            } catch (e) {
                // ignore
            }
        };
    }, [url, handleChunk, handleOpen, handleClose, handleError]);
    
    const renderMessageWithTokens = (message: string, tokenValues: { [key: string]: string }): string => {
        Object.entries(tokenValues).forEach(([name, value]) => {
            message = message.replace(`{${name}}`, value);
        });
        return message;
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
