import { useTranslation } from 'react-i18next';
import type { Message } from '../types/proPresenter';
import MessageItem from './MessageItem';
import { replaceAllTokens } from '../utils/tokenReplacement';
import { useMessages } from '../hooks/useMessages';
import ConnectionStatus from './ConnectionStatus';

export interface Notification {
    kind: 'success' | 'error';
    key: string;
    values?: { message: string };
}

interface MessageListProps {
    url: string;
    notify: (notification: Notification) => void;
    editingAddress: boolean;
    invalidAddress: boolean;
}

export default function MessageList({ url, notify, editingAddress, invalidAddress }: MessageListProps) {
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
        <div className="messages-region">
            <ConnectionStatus status={status} editingAddress={editingAddress} invalidAddress={invalidAddress} retry={retry} />
            {status === 'connected' && !messages.length && <p className="empty-messages">{t('message-list.empty')}</p>}
            <ul className="message-sheet">
                {messages.map(message => (
                    <MessageItem key={message.id.uuid} message={message} onShowMessage={show} onHideMessage={hide} />
                ))}
            </ul>
        </div>
    );
}
