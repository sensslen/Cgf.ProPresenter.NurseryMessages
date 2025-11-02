import React from 'react';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../utils/version';

const Footer: React.FC = () => {
    const { t } = useTranslation();
    
    return (
        <footer className="fixed bottom-0 left-0 w-full bg-linear-to-t from-60% from-white to-white/0 text-gray-600 text-center text-xs z-10 h-8 flex items-end justify-center p-1">
            {t('footer.version', { version: APP_VERSION })}
        </footer>
    );
};

export default Footer;
