import React, { useState, useEffect, Suspense } from 'react';
import MessageList from './components/MessageList';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import localizationsEn from '../locales/en.json';
import localizationsDe from '../locales/de.json';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: localizationsEn,
    },
    de: {
      translation: localizationsDe,
    },
  },
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  }
});

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    // Update the URL in the address bar without reloading
    window.history.pushState(null, '', `?url=${encodeURIComponent(newUrl)}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialUrl = params.get('url');
    if (initialUrl) {
      setUrl(decodeURIComponent(initialUrl));
    }
  }, []);

  useEffect(() => {
    const lng = navigator.language;
    i18n.changeLanguage(lng);
  }, []);

  return (
    <Suspense fallback={t("app.loading")}>
      <div className="p-4">
        {error && (
          <div className="bg-red-500 text-white p-2 mb-4">
            {error}
          </div>
        )}
        <div className="mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="border p-2 w-full"
            placeholder={t("app.enterProPresenterUrl")}
          />
        </div>
        {url && (
          <MessageList
            url={url}
            setError={setError}
          />
        )}
      </div>
    </Suspense>
  );
};

export default App;
