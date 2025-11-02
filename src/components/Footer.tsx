import React from 'react';
import { APP_VERSION } from '../utils/version';

const Footer: React.FC = () => {
    return (
        <footer className="fixed bottom-0 left-0 w-full bg-gray-800 text-white text-center py-2 text-sm z-10">
            Version {APP_VERSION}
        </footer>
    );
};

export default Footer;
