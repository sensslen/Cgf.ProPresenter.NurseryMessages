import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageList from './components/MessageList';
import type { Notification } from './components/MessageList';
import { APP_VERSION } from './utils/version';
import { normalizeConnectionUrl, readConnectionUrl, writeConnectionUrl } from './utils/urlEncoding';

export default function App() {
  const [url, setUrl] = useState(() => readConnectionUrl(window.location.search));
  const [attempt, setAttempt] = useState(0);
  const [draftUrl, setDraftUrl] = useState(url);
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const restore = () => {
      const restoredUrl = readConnectionUrl(window.location.search);
      setUrl(restoredUrl);
      setAttempt(previous => previous + 1);
      setDraftUrl(restoredUrl);
      setInvalidUrl(false);
      setNotification(null);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    if (notification?.kind !== 'success') return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  function connect(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const nextUrl = normalizeConnectionUrl(draftUrl);
      writeConnectionUrl(nextUrl);
      setUrl(nextUrl);
      setAttempt(previous => previous + 1);
      setDraftUrl(nextUrl);
      setInvalidUrl(false);
      setNotification(null);
    } catch (error) {
      console.error('Invalid connection address:', error);
      setInvalidUrl(true);
    }
  }

  function disconnect() {
    writeConnectionUrl('');
    setUrl('');
    setDraftUrl('');
    setInvalidUrl(false);
    setNotification(null);
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
      <form onSubmit={connect} className="mb-4">
        <label htmlFor="connection-url" className="block mb-1">{t('app.enterProPresenterUrl')}</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="connection-url"
            type="url"
            required
            value={draftUrl}
            onChange={event => {
              setDraftUrl(event.target.value);
              setInvalidUrl(false);
            }}
            aria-invalid={invalidUrl}
            aria-describedby={invalidUrl ? 'invalid-url' : undefined}
            placeholder="http://localhost:1025"
            className="border p-2 flex-1 min-w-0"
          />
          <button type="submit" className="bg-blue-700 text-white p-2">{t('app.connect')}</button>
          {url && <button type="button" onClick={disconnect} className="border p-2">{t('app.disconnect')}</button>}
        </div>
        {invalidUrl && <p id="invalid-url" role="alert" className="text-red-700 mt-2">{t('app.invalidUrl')}</p>}
      </form>
      {url && <MessageList key={`${url}:${attempt}`} url={url} notify={setNotification} />}
      <footer className="fixed bottom-0 left-0 w-full bg-white text-gray-600 text-center text-xs p-2">
        {t('footer.version', { version: APP_VERSION })}
      </footer>
    </div>
  );
}
