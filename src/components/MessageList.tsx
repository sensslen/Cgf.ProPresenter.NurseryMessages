import React, { useEffect, useState, useCallback } from 'react';
import { getMessages, triggerMessage } from '../api/proPresenter';
import { Message, TriggerPayloadToken } from '../types/proPresenter';
import MessageItem from './MessageItem';

interface MessageListProps {
    url: string;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const MessageList: React.FC<MessageListProps> = ({ url, setError }) => {
    const [messages, setMessages] = useState<Message[]>([]);

    // Fetch messages from the server
    const fetchMessages = useCallback(async () => {
        if (!url) return;

        try {
            const data = await getMessages(url);
            setMessages(data);
            setError(null); // Clear previous errors
        } catch (error) {
            if (error instanceof Error) {
                setError('Failed to connect to ProPresenter. Please check the URL and try again.');
                console.error('Error fetching messages:', error.message);
            } else {
                setError('An unexpected error occurred.');
                console.error('Unexpected error:', error);
            }
        }
    }, [url, setError]);

    // Fetch messages periodically
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchMessages();
        }, 1000); // Refresh every second

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
    }, [fetchMessages]);

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
            fetchMessages(); // Refresh messages after showing
        } catch (error) {
            if (error instanceof Error) {
                setError('Failed to show message. Please try again.');
                console.error('Error triggering message:', error.message);
            } else {
                setError('An unexpected error occurred.');
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
                        />
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MessageList;
