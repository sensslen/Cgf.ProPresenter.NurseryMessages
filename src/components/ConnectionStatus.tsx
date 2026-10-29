import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConnectionStatus as StreamStatus } from '../hooks/useMessages';

interface ConnectionStatusProps {
    status: StreamStatus | 'empty';
    editingAddress: boolean;
    invalidAddress: boolean;
    retry?: () => void;
}

export default function ConnectionStatus({ status, editingAddress, invalidAddress, retry }: ConnectionStatusProps) {
    const { t } = useTranslation();
    const element = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = element.current;
        const scroll = node?.closest<HTMLElement>('.app-scroll');
        if (!node || !scroll || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            scroll.style.setProperty('--status-height', `${node.getBoundingClientRect().height + 16}px`);
        });
        observer.observe(node);
        return () => {
            observer.disconnect();
            scroll.style.removeProperty('--status-height');
        };
    }, []);

    const failed = invalidAddress || status === 'failed';
    const state = invalidAddress ? 'invalid' : editingAddress && !failed ? 'editing' : status;
    const connection = status === 'empty' ? '' : t(
        status === 'failed' ? 'message-list.errors.failed-to-connect' : `message-list.${status}`,
    );
    const previous = status === 'connected' ? t('app.previousConnection') : connection;
    const text = invalidAddress
        ? `${t('app.invalidUrl')} ${previous}`.trim()
        : editingAddress
            ? `${t('app.editingAddress')} ${previous}`.trim()
            : connection || t('app.connectHint');

    return (
        <div ref={element} id="connection-status" className="connection-status" data-state={state}>
            <p role={failed ? 'alert' : 'status'} className="connection-status-text">
                <span className="status-dot" aria-hidden="true" />
                <span>{text}</span>
            </p>
            {status === 'failed' && !editingAddress && !invalidAddress && retry && (
                <button type="button" onClick={retry} className="retry-button">{t('message-list.retry')}</button>
            )}
        </div>
    );
}
