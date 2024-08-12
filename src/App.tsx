import React, { useState, useEffect } from 'react';
import MessageList from './components/MessageList';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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

  return (
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
          placeholder="Enter ProPresenter URL/IP"
        />
      </div>
      {url && (
        <MessageList
          url={url}
          setError={setError}
        />
      )}
    </div>
  );
};

export default App;
