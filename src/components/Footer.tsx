import React from 'react';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../utils/version';

const Footer: React.FC = () => {
    const { t } = useTranslation();
    
    return (
        <footer className="fixed bottom-0 left-0 w-full bg-white/80 text-gray-600 text-center py-1 text-xs z-10">
            {t('footer.version', { version: APP_VERSION })}
        </footer>
    );
};

export default Footer;
