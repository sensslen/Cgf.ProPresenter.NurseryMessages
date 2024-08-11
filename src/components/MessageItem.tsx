import React, { useState } from 'react';
import { Message, Token } from '../types/proPresenter';
import TokenInput from './TokenInput';

interface MessageItemProps {
    message: Message;
    onShowMessage: (message: Message, tokenValues: { [key: string]: string }) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onShowMessage }) => {
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

    const renderMessageWithTokens = (message: string, tokens: Token[]): string => {
        let matchIndex = 0;
        return message.replace(/\$\{(.*?)\}/g, () => {
            if (tokens.length <= matchIndex) {
                return '';
            }
            const value = tokenValues[tokens[matchIndex]?.name];
            matchIndex++;
            if (value === undefined) {
                return '';
            }
            return value;
        });
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
                <p className="text-sm font-medium text-gray-600">Formatted Message:</p>
                <p className="text-sm text-gray-700">
                    {renderMessageWithTokens(message.message, message.tokens)}
                </p>
            </div>
            <button
                onClick={() => onShowMessage(message, tokenValues)}
                className="bg-green-500 text-white p-2 mt-2"
            >
                Show
            </button>
        </li>
    );
};

export default MessageItem;
