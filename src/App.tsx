import React, { useState, useEffect, Suspense } from 'react';
import MessageList from './components/MessageList';
import Footer from './components/Footer';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import localizationsEn from '../locales/en.json';
import localizationsDe from '../locales/de.json';
import localizationsZh from '../locales/zh.json';
import localizationsHi from '../locales/hi.json';
import localizationsEs from '../locales/es.json';
import localizationsFr from '../locales/fr.json';
import localizationsAr from '../locales/ar.json';
import localizationsBn from '../locales/bn.json';
import { encodeUrlToBase64, decodeBase64ToUrl } from './utils/urlEncoding';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: localizationsEn,
    },
    de: {
      translation: localizationsDe,
    },
    zh: {
      translation: localizationsZh,
    },
    hi: {
      translation: localizationsHi,
    },
    es: {
      translation: localizationsEs,
    },
    fr: {
      translation: localizationsFr,
    },
    ar: {
      translation: localizationsAr,
    },
    bn: {
      translation: localizationsBn,
    },
  },
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  }
});

// Constants for URL parameter names to ensure type safety
const URL_PARAM_KEY = 'url' as const;

const App: React.FC = () => {
  // Initialize URL from query parameter at component creation
  // Using lazy initialization to avoid calling getInitialUrl on every render
  const [url, setUrl] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get(URL_PARAM_KEY);
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
  });
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    // Update the URL in the address bar without reloading
    // Encode the URL in Base64 for better security and readability
    if (newUrl) {
      const encodedUrl = encodeUrlToBase64(newUrl);
      window.history.pushState(null, '', `?${URL_PARAM_KEY}=${encodedUrl}`);
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

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000); // Clear the error message after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <Suspense fallback={t("app.loading")}> 
      <div className="p-4 min-h-screen relative pb-12">
        {/* Top fixed error/success banner, only one at a time */}
        {(error || connectionError || success) && (
          <div className="fixed top-0 left-0 w-full z-50 flex justify-center pointer-events-none">
            {error && (
              <div className="bg-red-500 text-white p-2 mt-2 rounded shadow pointer-events-auto">
                {error}
              </div>
            )}
            {!error && connectionError && (
              <div className="bg-yellow-500 text-white p-2 mt-2 rounded shadow pointer-events-auto">
                {connectionError}
              </div>
            )}
            {!error && !connectionError && success && (
              <div className="bg-green-500 text-white p-2 mt-2 rounded shadow pointer-events-auto">
                {success}
              </div>
            )}
          </div>
        )}
        {/* Main content */}
        <div className="mb-4 pt-8">
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
            setConnectionError={setConnectionError}
          />
        )}
        <Footer />
      </div>
    </Suspense>
  );
};

export default App;
