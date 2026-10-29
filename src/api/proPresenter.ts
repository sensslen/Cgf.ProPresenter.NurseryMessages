import { messageUpdateSchema } from '../types/proPresenter';
import type { Message, MessageUpdate, TriggerPayload } from '../types/proPresenter';
import { normalizeConnectionUrl } from '../utils/urlEncoding';

export class StreamError extends Error {
    constructor(message: string, readonly statusCode: number) {
        super(message);
        this.name = 'StreamError';
    }
}

export class StreamProtocolError extends Error {}

const MAX_MESSAGE_LENGTH = 1_048_576;

export async function* streamMessages(url: string, signal: AbortSignal): AsyncGenerator<MessageUpdate> {
    const resource = `${normalizeConnectionUrl(url)}/v1/messages?chunked=true`;
    const response = await fetch(resource, { signal });
    if (!response.ok) {
        await response.body?.cancel();
        throw new StreamError(`Failed to stream messages: ${response.status}`, response.status);
    }
    if (!response.body) {
        throw new StreamProtocolError('Message stream has no body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let buffer = '';
    let offset = 0;
    let depth = 0;
    let inString = false;
    let escaped = false;

    try {
        while (true) {
            const { value, done } = await reader.read();
            signal.throwIfAborted();
            try {
                buffer += decoder.decode(value, { stream: !done });
            } catch {
                throw new StreamProtocolError('Message stream contains invalid UTF-8');
            }

            let start = 0;
            while (offset < buffer.length) {
                const ch = buffer[offset];
                if (offset - start >= MAX_MESSAGE_LENGTH) {
                    throw new StreamProtocolError('Message exceeds 1,048,576 characters');
                }
                if (depth === 0) {
                    if (/\s/.test(ch)) {
                        start = ++offset;
                        continue;
                    }
                    if (ch !== '{' && ch !== '[') {
                        throw new StreamProtocolError('Expected a JSON message or message list');
                    }
                }

                if (inString) {
                    if (escaped) escaped = false;
                    else if (ch === '\\') escaped = true;
                    else if (ch === '"') inString = false;
                } else if (ch === '"') {
                    inString = true;
                } else if (ch === '{' || ch === '[') {
                    depth++;
                } else if (ch === '}' || ch === ']') {
                    depth--;
                }
                offset++;

                if (depth === 0) {
                    let parsed: unknown;
                    try {
                        parsed = JSON.parse(buffer.slice(start, offset));
                    } catch {
                        throw new StreamProtocolError('Message stream contains invalid JSON');
                    }
                    const result = messageUpdateSchema.safeParse(parsed);
                    if (!result.success) {
                        throw new StreamProtocolError(`Invalid message payload: ${result.error.message}`);
                    }
                    yield result.data;
                    signal.throwIfAborted();
                    start = offset;
                }
            }
            buffer = buffer.slice(start);
            offset -= start;
            if (done) {
                if (buffer.trim()) {
                    throw new StreamProtocolError('Message stream ended with incomplete JSON');
                }
                return;
            }
        }
    } finally {
        try {
            await reader.cancel();
        } finally {
            reader.releaseLock();
        }
    }
}

export function createTriggerPayload(message: Message, values: Record<string, string>): TriggerPayload {
    return message.tokens.map(token => ({
        ...token,
        ...(token.text ? { text: { ...token.text, text: values[token.name] ?? '' } } : {}),
    }));
}

async function requestMessage(resource: string, init: RequestInit, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), 15_000);
    try {
        const response = await fetch(resource, { ...init, signal: controller.signal });
        controller.signal.throwIfAborted();
        await response.body?.cancel();
        if (!response.ok) {
            throw new StreamError(`Message request failed: ${response.status}`, response.status);
        }
    } catch (error) {
        controller.signal.throwIfAborted();
        throw error;
    } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
    }
}

export function triggerMessage(url: string, id: string, payload: TriggerPayload, signal: AbortSignal): Promise<void> {
    return requestMessage(`${normalizeConnectionUrl(url)}/v1/message/${encodeURIComponent(id)}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }, signal);
}

export function clearMessage(url: string, id: string, signal: AbortSignal): Promise<void> {
    return requestMessage(`${normalizeConnectionUrl(url)}/v1/message/${encodeURIComponent(id)}/clear`, {}, signal);
}
