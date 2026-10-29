import { useId, useState } from 'react';
import type { Message } from '../types/proPresenter';
import TokenInput from './TokenInput';
import { useTranslation } from 'react-i18next';
import { replaceAllTokens } from '../utils/tokenReplacement';

interface MessageItemProps {
    message: Message;
    onShowMessage: (message: Message, tokenValues: Record<string, string>) => Promise<void>;
    onHideMessage: (message: Message) => Promise<void>;
}

export default function MessageItem({ message, onShowMessage, onHideMessage }: MessageItemProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [pending, setPending] = useState<'show' | 'hide' | null>(null);
    const tokenValues = Object.fromEntries(
        message.tokens.filter(token => token.text).map(token => [
            token.name,
            Object.prototype.hasOwnProperty.call(drafts, token.name) ? drafts[token.name] : '',
        ]),
    );

    async function submit(kind: 'show' | 'hide', action: () => Promise<void>) {
        setPending(kind);
        try {
            await action();
        } finally {
            setPending(null);
        }
    }

    return (
        <li className={`message-row${message.is_active ? ' active' : ''}`}>
            <form onSubmit={event => {
                event.preventDefault();
                if (!pending) void submit('show', () => onShowMessage(message, tokenValues));
            }} aria-busy={Boolean(pending)} aria-labelledby={titleId}>
                <div className="message-heading">
                    <h2 id={titleId} dir="auto">{message.id.name}</h2>
                    {message.is_active && (
                        <span className="on-screen"><span className="status-dot" aria-hidden="true" />{t('message-item.on-screen')}</span>
                    )}
                </div>
                <div className={`token-fields${message.tokens.filter(token => token.text).length === 1 ? ' single' : ''}`}>
                    {message.tokens.map(token => token.text ? (
                        <TokenInput
                            key={token.name}
                            token={token}
                            tokenValue={tokenValues[token.name]}
                            setTokenValue={value => setDrafts(previous => ({ ...previous, [token.name]: value }))}
                        />
                    ) : (
                        <p key={token.name} className="managed-token" dir="auto">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                <circle cx="10" cy="10" r="7.5" /><path d="M10 5v5l3 2" />
                            </svg>
                            {token.name}: {t('message-item.managed-token')}
                        </p>
                    ))}
                </div>
                <div className="message-preview">
                    <p className="preview-label">{t('message-item.preview')}</p>
                    <p className="preview-text" dir="auto">{replaceAllTokens(message.message, tokenValues)}</p>
                </div>
                <div className="message-actions">
                    <button type="submit" disabled={Boolean(pending)} className={message.is_active ? '' : 'primary-button'}>
                        {pending === 'show' && <span className="pending-indicator" aria-hidden="true" />}
                        {t(message.is_active ? 'message-item.show-again' : 'message-item.show')}
                    </button>
                    {message.is_active && (
                        <button
                            type="button"
                            disabled={Boolean(pending)}
                            onClick={() => void submit('hide', () => onHideMessage(message))}
                            className="hide-button"
                        >
                            {pending === 'hide' && <span className="pending-indicator" aria-hidden="true" />}
                            {t('message-item.hide')}
                        </button>
                    )}
                </div>
            </form>
        </li>
    );
}
