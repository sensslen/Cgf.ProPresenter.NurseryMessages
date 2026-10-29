import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageList from './components/MessageList';
import type { Notification } from './components/MessageList';
import { APP_VERSION } from './utils/version';
import { normalizeConnectionUrl, readConnectionUrl, writeConnectionUrl } from './utils/urlEncoding';

export default function App() {
  const [url, setUrl] = useState(() => readConnectionUrl(window.location.search));
  const [draftUrl, setDraftUrl] = useState(url);
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!draftUrl.trim() || draftUrl === url) return;
    const timer = setTimeout(() => {
      try {
        const nextUrl = normalizeConnectionUrl(draftUrl);
        writeConnectionUrl(nextUrl);
        setUrl(nextUrl);
        setInvalidUrl(false);
        setNotification(null);
      } catch (error) {
        console.error('Invalid connection address:', error);
        setInvalidUrl(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draftUrl, url]);

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
    <div className="mx-auto max-w-3xl min-h-screen p-4 pb-12">
      {notification && (
        <div
          role={notification.kind === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded p-3 text-white ${notification.kind === 'error' ? 'bg-red-700' : 'bg-green-700'}`}
        >
          {t(notification.key, notification.values)}
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="connection-url" className="block mb-1">{t('app.enterProPresenterUrl')}</label>
        <input
          id="connection-url"
          type="url"
          value={draftUrl}
          onChange={event => changeAddress(event.target.value)}
          aria-invalid={invalidUrl}
          aria-describedby={invalidUrl ? 'invalid-url' : undefined}
          placeholder="http://localhost:1025"
          className="border p-2 w-full"
        />
        {invalidUrl && <p id="invalid-url" role="alert" className="text-red-700 mt-2">{t('app.invalidUrl')}</p>}
      </div>
      {url && <MessageList key={url} url={url} notify={setNotification} />}
      <footer className="fixed bottom-0 left-0 w-full bg-white text-gray-600 text-center text-xs p-2">
        {t('footer.version', { version: APP_VERSION })}
      </footer>
    </div>
  );
}
