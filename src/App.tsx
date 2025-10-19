import React, { useState, useEffect, Suspense } from 'react';
import MessageList from './components/MessageList';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import localizationsEn from '../locales/en.json';
import localizationsDe from '../locales/de.json';
import { encodeUrlToBase64, decodeBase64ToUrl } from './utils/urlEncoding';

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
  // Initialize URL from query parameter at component creation
  const getInitialUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      try {
        // Try to decode as Base64 first (new format)
        return decodeBase64ToUrl(urlParam);
      } catch {
        // Fallback to decodeURIComponent for backward compatibility
        try {
          return decodeURIComponent(urlParam);
        } catch {
          console.warn('Failed to decode URL parameter');
          return '';
        }
      }
    }
    return '';
  };

  const [url, setUrl] = useState<string>(getInitialUrl);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    // Update the URL in the address bar without reloading
    // Encode the URL in Base64 for better security and readability
    if (newUrl) {
      const encodedUrl = encodeUrlToBase64(newUrl);
      window.history.pushState(null, '', `?url=${encodedUrl}`);
    } else {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  useEffect(() => {
    const lng = navigator.language;
    i18n.changeLanguage(lng);
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000); // Clear the success message after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <Suspense fallback={t("app.loading")}>
      <div className="p-4">
        {error && (
          <div className="bg-red-500 text-white p-2 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500 text-white p-2 mb-4">
            {success}
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
            setSuccess={setSuccess}
          />
        )}
      </div>
    </Suspense>
  );
};

export default App;
