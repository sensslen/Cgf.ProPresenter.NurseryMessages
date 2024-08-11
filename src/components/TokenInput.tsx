import React from 'react';
import { Token } from '../types/proPresenter';

interface TokenInputProps {
    token: Token;
    tokenValue: string;
    setTokenValue: (value: string) => void; // Explicitly typed
}

const TokenInput: React.FC<TokenInputProps> = ({ token, tokenValue, setTokenValue }) => {
    return (
        <div className="my-2">
            <label className="block">{token.name}</label>
            <input
                type="text"
                value={tokenValue}
                onChange={(e) => setTokenValue(e.target.value)}
                className="border p-2 w-full"
            />
        </div>
    );
};

export default TokenInput;
