import React, { useEffect, useCallback } from 'react';
import { triggerMessage, clearMessage } from '../api/proPresenter';
import { Message, TriggerPayloadToken } from '../types/proPresenter';
import MessageItem from './MessageItem';
import { useTranslation } from 'react-i18next';
import { useProPresenterConnection } from '../hooks/useProPresenterConnection';

interface MessageListProps {
    url: string;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setConnectionError: React.Dispatch<React.SetStateAction<string | null>>;
    setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
}

const MessageList: React.FC<MessageListProps> = ({ url, setError, setConnectionError, setSuccess }) => {
    const { t } = useTranslation();

    // Use the new hook that handles WebSocket with polling fallback
    const { messages, connectionStatus, webSocketStatus } = useProPresenterConnection({
        url,
        pollingInterval: 1000,
        enableWebSocket: true,
        onError: (error) => {
            setConnectionError(t('message-list.errors.failed-to-connect'));
            console.error('Connection error:', error.message);
        },
    });

    // Log connection status changes for debugging
    useEffect(() => {
        console.log(`Connection mode: ${connectionStatus}, WebSocket status: ${webSocketStatus}`);
    }, [connectionStatus, webSocketStatus]);
    
    const renderMessageWithTokens = (message: string, tokenValues: { [key: string]: string }): string => {
        Object.entries(tokenValues).forEach(([name, value]) => {
            message = message.replace(`{${name}}`, value);
        });
        return message;
    };

    const handleShowMessage = useCallback(async (message: Message, tokenValues: { [key: string]: string }) => {
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
            // Messages will be updated automatically via WebSocket or polling
        } catch (error) {
            if (error instanceof Error) {
                setError(t('message-list.errors.failed-to-show'));
                console.error('Error triggering message:', error.message);
            } else {
                setError(t("message-list.errors.unknown-error", { error }));
                console.error('Unexpected error:', error);
            }
        }
    }, [url, setError, setSuccess, t]);

    const handleHideMessage = useCallback(async (message: Message) => {
        if (!url) return;
        try {
            await clearMessage(url, message.id.uuid);
            setError(null);
            setSuccess(t('message-list.success.message-hidden', { message: message.message }));
            // Messages will be updated automatically via WebSocket or polling
        } catch (error) {
            if (error instanceof Error) {
                setError(t('message-list.errors.failed-to-hide'));
                console.error('Error hiding message:', error.message);
            } else {
                setError(t('message-list.errors.unknown-error', { error }));
                console.error('Unexpected error:', error);
            }
        }
    }, [url, setError, setSuccess, t]);

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
