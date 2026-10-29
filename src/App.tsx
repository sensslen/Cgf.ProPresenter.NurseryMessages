import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageList from './components/MessageList';
import type { Notification } from './components/MessageList';
import ConnectionStatus from './components/ConnectionStatus';
import { APP_VERSION } from './utils/version';
import { InvalidConnectionUrlError, normalizeConnectionUrl, readConnectionUrl, writeConnectionUrl } from './utils/urlEncoding';

export default function App() {
  const [url, setUrl] = useState(() => readConnectionUrl(window.location.search));
  const [draftUrl, setDraftUrl] = useState(url);
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const { t } = useTranslation();
  const draftAddress = useMemo(() => {
    try {
      return { url: normalizeConnectionUrl(draftUrl), error: null };
    } catch (error) {
      if (!(error instanceof InvalidConnectionUrlError)) throw error;
      return { url: null, error };
    }
  }, [draftUrl]);
  const editingAddress = Boolean(draftUrl.trim()) && draftAddress.url !== url;

  useEffect(() => {
    if (!editingAddress) return;
    const timer = setTimeout(() => {
      if (draftAddress.url === null) {
        console.error('Invalid connection address:', draftAddress.error);
        setInvalidUrl(true);
        return;
      }
      writeConnectionUrl(draftAddress.url);
      setUrl(draftAddress.url);
      setInvalidUrl(false);
      setNotification(null);
    }, 500);
    return () => clearTimeout(timer);
  }, [draftAddress, editingAddress]);

  useEffect(() => {
    if (notification?.kind !== 'success') return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  function changeAddress(value: string) {
    setDraftUrl(value);
    setInvalidUrl(false);
    setNotification(null);
    if (!value.trim()) {
      writeConnectionUrl('');
      setUrl('');
    }
  }

  return (
    <div className="app-shell">
      <main className="app-scroll">
        <div className="app-content">
          <h1>{t('app.title')}</h1>
          <div className="connection-field">
            <label htmlFor="connection-url">{t('app.enterProPresenterUrl')}</label>
            <input
              id="connection-url"
              type="url"
              dir="ltr"
              value={draftUrl}
              onChange={event => changeAddress(event.target.value)}
              aria-invalid={invalidUrl}
              aria-describedby="connection-status"
              placeholder="http://localhost:1025"
              className="connection-address"
            />
          </div>
          {url ? (
            <MessageList
              key={url}
              url={url}
              notify={setNotification}
              editingAddress={editingAddress}
              invalidAddress={invalidUrl}
            />
          ) : (
            <ConnectionStatus
              status="empty"
              editingAddress={editingAddress}
              invalidAddress={invalidUrl}
            />
          )}
        </div>
      </main>
      {notification && (
        <div className="notification-dock">
          <div className="notification" data-kind={notification.kind}>
            <p role={notification.kind === 'error' ? 'alert' : 'status'}>
              {t(notification.key, notification.values)}
            </p>
            <button type="button" className="dismiss-button" aria-label={t('app.dismissNotification')} onClick={() => setNotification(null)}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 4 8 8m0-8-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <footer className="app-footer">
        {t('footer.version', { version: APP_VERSION })}
      </footer>
    </div>
  );
}
