import { useEffect, useRef, useState } from 'react';
import { clearMessage, createTriggerPayload, streamMessages, StreamError, StreamProtocolError, triggerMessage } from '../api/proPresenter';
import type { Message } from '../types/proPresenter';
import { InvalidConnectionUrlError } from '../utils/urlEncoding';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed';
interface ConnectionState {
    url: string;
    messages: Message[];
    status: ConnectionStatus;
}

export function useMessages(url: string) {
    const [state, setState] = useState<ConnectionState>({ url, messages: [], status: 'connecting' });
    const session = useRef<AbortController | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;
        session.current = controller;

        async function connect() {
            let retries = 0;
            while (!signal.aborted) {
                try {
                    for await (const update of streamMessages(url, signal)) {
                        if (signal.aborted) return;
                        retries = 0;
                        setState(previous => {
                            const messages = previous.url === url ? previous.messages : [];
                            const next = Array.isArray(update) ? update :
                                messages.some(message => message.id.uuid === update.id.uuid)
                                    ? messages.map(message => message.id.uuid === update.id.uuid ? update : message)
                                    : [...messages, update];
                            return { url, messages: next, status: 'connected' };
                        });
                    }
                    throw new Error('Message stream closed unexpectedly');
                } catch (error) {
                    if (signal.aborted) return;
                    console.error('Message connection failed:', error);
                    const terminal = error instanceof StreamProtocolError || error instanceof InvalidConnectionUrlError ||
                        (error instanceof StreamError && ![404, 408, 429].includes(error.statusCode) && error.statusCode < 500);
                    setState(previous => ({
                        url,
                        messages: previous.url === url ? previous.messages : [],
                        status: terminal ? 'failed' : 'reconnecting',
                    }));
                    if (terminal) return;
                }

                const delay = Math.min(1000 * 2 ** retries++, 30_000);
                await new Promise<void>(resolve => {
                    const resume = () => {
                        clearTimeout(timer);
                        signal.removeEventListener('abort', resume);
                        resolve();
                    };
                    const timer = setTimeout(resume, Math.min(delay * (1 + Math.random() * 0.3), 30_000));
                    signal.addEventListener('abort', resume, { once: true });
                });
            }
        }
        void connect();
        return () => controller.abort();
    }, [url]);

    function currentSignal(): AbortSignal {
        const signal = session.current?.signal;
        if (!signal || signal.aborted) throw new DOMException('Connection changed', 'AbortError');
        return signal;
    }

    async function showMessage(message: Message, values: Record<string, string>) {
        await triggerMessage(url, message.id.uuid, createTriggerPayload(message, values), currentSignal());
    }

    async function hideMessage(message: Message) {
        await clearMessage(url, message.id.uuid, currentSignal());
    }

    return {
        messages: state.url === url ? state.messages : [],
        status: state.url === url ? state.status : 'connecting',
        showMessage,
        hideMessage,
    };
}
