import { useTranslation } from 'react-i18next';
import type { Message } from '../types/proPresenter';
import MessageItem from './MessageItem';
import { replaceAllTokens } from '../utils/tokenReplacement';
import { useMessages } from '../hooks/useMessages';

export interface Notification {
    kind: 'success' | 'error';
    key: string;
    values?: { message: string };
}

interface MessageListProps {
    url: string;
    notify: (notification: Notification) => void;
}

export default function MessageList({ url, notify }: MessageListProps) {
    const { messages, status, showMessage, hideMessage, retry } = useMessages(url);
    const { t } = useTranslation();

    async function show(message: Message, values: Record<string, string>) {
        try {
            await showMessage(message, values);
            notify({
                kind: 'success',
                key: 'message-list.success.message-shown-with-details',
                values: { message: replaceAllTokens(message.message, values) },
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            console.error('Failed to show message:', error);
            notify({ kind: 'error', key: 'message-list.errors.failed-to-show' });
        }
    }

    async function hide(message: Message) {
        try {
            await hideMessage(message);
            notify({
                kind: 'success',
                key: 'message-list.success.message-hidden',
                values: { message: message.message },
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            console.error('Failed to hide message:', error);
            notify({ kind: 'error', key: 'message-list.errors.failed-to-hide' });
        }
    }

    return (
        <div>
            <p role={status === 'failed' ? 'alert' : 'status'} className="mb-4">
                {t(status === 'failed' ? 'message-list.errors.failed-to-connect' : `message-list.${status}`)}
            </p>
            {status === 'failed' && (
                <button type="button" onClick={retry} className="border p-2 mb-4">{t('message-list.retry')}</button>
            )}
            {status === 'connected' && !messages.length && <p>{t('message-list.empty')}</p>}
            <ul>
                {messages.map(message => (
                    <MessageItem key={message.id.uuid} message={message} onShowMessage={show} onHideMessage={hide} />
                ))}
            </ul>
        </div>
    );
}
