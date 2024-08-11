import React, { useState } from 'react';
import MessageList from './components/MessageList';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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
          onChange={(e) => setUrl(e.target.value)}
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
