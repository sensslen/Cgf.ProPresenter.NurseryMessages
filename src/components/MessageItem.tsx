import React, { useState } from 'react';
import { Message } from '../types/proPresenter';
import TokenInput from './TokenInput';
import { Trans, useTranslation } from 'react-i18next';

interface MessageItemProps {
    message: Message;
    onShowMessage: (message: Message, tokenValues: { [key: string]: string }) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onShowMessage }) => {
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
        Object.entries(tokenValues).forEach(([name, value]) => {
            message = message.replace(`{${name}}`, value);
        });
        return message;
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
                <Trans i18nKey="message-item.formatted-message" t={t} components={{ description_format: <p className="text-sm font-medium text-gray-400" />, message_format: <p className="text-sm text-gray-700" /> }} values={{ message: renderMessageWithTokens(message.message) }} />
            </div >
            <button
                onClick={() => onShowMessage(message, tokenValues)}
                className="bg-green-500 text-white p-2 mt-2"
            >
                {t('message-item.show')}
            </button>
        </li >
    );
};

export default MessageItem;
