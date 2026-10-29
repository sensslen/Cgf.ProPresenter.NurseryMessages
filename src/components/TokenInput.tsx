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
        <div className="my-2">
            <label htmlFor={id} className="block">{token.name}</label>
            <input
                id={id}
                type="text"
                value={tokenValue}
                onChange={event => setTokenValue(event.target.value)}
                className="border p-2 w-full"
            />
        </div>
    );
}
