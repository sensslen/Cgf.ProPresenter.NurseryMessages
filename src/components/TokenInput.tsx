import { useId } from 'react';
import type { Token } from '../types/proPresenter';

interface TokenInputProps {
    token: Token;
    tokenValue: string;
    setTokenValue: (value: string) => void;
}

export default function TokenInput({ token, tokenValue, setTokenValue }: TokenInputProps) {
    const id = useId();
    return (
        <div className="token-field">
            <label htmlFor={id} dir="auto">{token.name}</label>
            <input
                id={id}
                type="text"
                dir="auto"
                value={tokenValue}
                onChange={event => setTokenValue(event.target.value)}
            />
        </div>
    );
}
