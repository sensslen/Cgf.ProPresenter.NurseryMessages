import { useState } from 'react';
import type { Message } from '../types/proPresenter';
import TokenInput from './TokenInput';
import { Trans, useTranslation } from 'react-i18next';
import { replaceAllTokens } from '../utils/tokenReplacement';

interface MessageItemProps {
    message: Message;
    onShowMessage: (message: Message, tokenValues: Record<string, string>) => Promise<void>;
    onHideMessage: (message: Message) => Promise<void>;
}

export default function MessageItem({ message, onShowMessage, onHideMessage }: MessageItemProps) {
    const { t } = useTranslation();
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [pending, setPending] = useState(false);
    const tokenValues = Object.fromEntries(
        message.tokens.filter(token => token.text).map(token => [token.name, drafts[token.name] ?? '']),
    );

    async function submit(action: () => Promise<void>) {
        setPending(true);
        try {
            await action();
        } finally {
            setPending(false);
        }
    }

    return (
        <li className="mb-4 p-3 border">
            <form onSubmit={event => {
                event.preventDefault();
                if (!pending) void submit(() => onShowMessage(message, tokenValues));
            }} aria-busy={pending}>
                <h2 className="text-lg font-bold">{message.id.name}</h2>
                {message.tokens.map(token => token.text ? (
                    <TokenInput
                        key={token.name}
                        token={token}
                        tokenValue={tokenValues[token.name]}
                        setTokenValue={value => setDrafts(previous => ({ ...previous, [token.name]: value }))}
                    />
                ) : (
                    <p key={token.name} className="my-2 text-gray-600">
                        {token.name}: {t('message-item.managed-token')}
                    </p>
                ))}
                <div className="mt-4 flex flex-wrap gap-2">
                    <Trans
                        i18nKey="message-item.formatted-message"
                        components={[<span className="text-sm font-medium text-gray-600" />, <span className="text-sm text-gray-700" />]}
                        values={{ message: replaceAllTokens(message.message, tokenValues) }}
                    />
                </div>
                <div className="flex gap-2 mt-2">
                    {message.is_active && (
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() => void submit(() => onHideMessage(message))}
                            className="bg-red-700 text-white p-2 disabled:opacity-50"
                        >
                            {t('message-item.hide')}
                        </button>
                    )}
                    <button type="submit" disabled={pending} className="bg-green-700 text-white p-2 disabled:opacity-50">
                        {t(message.is_active ? 'message-item.show-again' : 'message-item.show')}
                    </button>
                </div>
            </form>
        </li>
    );
}
