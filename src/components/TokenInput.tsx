import React, { useCallback } from 'react';
import { Token } from '../types/proPresenter';

interface TokenInputProps {
    token: Token;
    tokenValue: string;
    setTokenValue: (value: string) => void; // Explicitly typed
}

const TokenInput: React.FC<TokenInputProps> = ({ token, tokenValue, setTokenValue }) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTokenValue(e.target.value);
    }, [setTokenValue]);

    return (
        <div className="my-2">
            <label className="block">{token.name}</label>
            <input
                type="text"
                value={tokenValue}
                placeholder={token.name}
                onChange={handleChange}
                className="border p-2 w-full"
            />
        </div>
    );
};

export default TokenInput;
