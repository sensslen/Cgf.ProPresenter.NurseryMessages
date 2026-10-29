import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import de from '../locales/de.json';
import zh from '../locales/zh.json';
import hi from '../locales/hi.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';
import bn from '../locales/bn.json';
import pt from '../locales/pt.json';
import ko from '../locales/ko.json';
import no from '../locales/no.json';
import cs from '../locales/cs.json';
import ru from '../locales/ru.json';

function updateDocumentLanguage(language: string) {
  const resolvedLanguage = i18n.resolvedLanguage ?? language;
  document.documentElement.lang = resolvedLanguage;
  document.documentElement.dir = i18n.dir(resolvedLanguage);
}

i18n.on('languageChanged', updateDocumentLanguage);
void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries({ en, de, zh, hi, es, fr, ar, bn, pt, ko, no, cs, ru })
      .map(([language, translation]) => [language, { translation }]),
  ),
  lng: navigator.language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
