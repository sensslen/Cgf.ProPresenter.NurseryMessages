import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConnectionStatusProps {
    status: 'connected' | 'disconnected' | 'connecting';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
    const { t } = useTranslation();

    const statusConfig = {
        connected: {
            bg: 'bg-green-500',
            text: t('app.connectionStatus.connected'),
            icon: '●'
        },
        disconnected: {
            bg: 'bg-red-500',
            text: t('app.connectionStatus.disconnected'),
            icon: '●'
        },
        connecting: {
            bg: 'bg-yellow-500',
            text: t('app.connectionStatus.connecting'),
            icon: '●'
        }
    };

    const config = statusConfig[status];

    return (
        <div className="flex items-center gap-2 text-sm">
            <span className={`${config.bg} w-3 h-3 rounded-full inline-block`} aria-hidden="true">
                {status === 'connecting' && (
                    <span className="animate-pulse block w-full h-full rounded-full"></span>
                )}
            </span>
            <span className="font-medium">{config.text}</span>
        </div>
    );
};

export default ConnectionStatus;
