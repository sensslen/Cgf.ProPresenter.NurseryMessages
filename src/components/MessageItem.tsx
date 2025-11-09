import React, { useState } from 'react';
import { Message } from '../types/proPresenter';
import TokenInput from './TokenInput';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';

interface MessageItemProps {
    message: Message;
    onShowMessage: (message: Message, tokenValues: { [key: string]: string }) => void;
    onHideMessage: (message: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onShowMessage, onHideMessage }) => {
    const { t } = useTranslation();
    const [tokenValues, setTokenValues] = useState<{ [key: string]: string }>(() => {
        // Initialize token values based on message tokens
        const initialTokenValues: { [key: string]: string } = {};
        message.tokens.forEach(token => {
            if (token.name) {
                initialTokenValues[token.name] = '';
            }
        });
        return initialTokenValues;
    });

    const renderMessageWithTokens = (message: string): string => {
        // First, sanitize each token value to prevent XSS
        Object.entries(tokenValues).forEach(([name, value]) => {
            // Sanitize the token value (strip all HTML tags and attributes from user input)
            const sanitizedValue = DOMPurify.sanitize(value, { 
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: []
            });
            message = message.replace(`{${name}}`, sanitizedValue);
        });
        
        // Then sanitize the entire message, allowing safe HTML tags
        // This allows XML/HTML tags in the message template while protecting against XSS
        const sanitizedMessage = DOMPurify.sanitize(message, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'a'],
            ALLOWED_ATTR: ['href', 'class'],
            // Restrict href to safe protocols only (http, https, mailto)
            ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i
        });
        
        return sanitizedMessage;
    };

    return (
        <li className="mb-4 p-2 border">
            <h3 className="text-lg font-bold">{message.id.name}</h3>
            <div className="mt-2">
                {message.tokens.map((token) => (
                    <TokenInput
                        key={token.name}
                        token={token}
                        tokenValue={tokenValues[token.name] || ''}
                        setTokenValue={(value: string) => setTokenValues((prev) => ({ ...prev, [token.name]: value }))}
                    />
                ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
                <p className="text-sm font-medium text-gray-400">{t('message-item.formatted-message-label', 'Formatted message:')}</p>
                <p 
                    className="text-sm text-gray-700"
                    dangerouslySetInnerHTML={{ __html: renderMessageWithTokens(message.message) }}
                />
            </div>
            <div className="flex gap-2 mt-2">
                {(message.is_active === true) && (
                    <button
                        onClick={() => onHideMessage(message)}
                        className="bg-red-500 text-white p-2"
                    >
                        {t('message-item.hide', 'Hide')}
                    </button>
                )}
                <button
                    onClick={() => onShowMessage(message, tokenValues)}
                    className={"bg-green-500 text-white p-2"}
                >
                    {(message.is_active === true) ? t('message-item.show-again', 'Show again') : t('message-item.show', 'Show')}
                </button>
            </div>
        </li>
    );
};

export default MessageItem;
