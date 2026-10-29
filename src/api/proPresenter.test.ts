import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMessage, createTriggerPayload, streamMessages, StreamError, StreamProtocolError, triggerMessage } from './proPresenter';
import { clock, message, timer } from '../test/messages';
import type { MessageUpdate } from '../types/proPresenter';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

function respond(chunks: Uint8Array[]) {
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            chunks.forEach(chunk => controller.enqueue(chunk));
            controller.close();
        },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    return body;
}

async function collect() {
    const updates: MessageUpdate[] = [];
    for await (const update of streamMessages('http://localhost:1025/', new AbortController().signal)) {
        updates.push(update);
    }
    return updates;
}

describe('message streaming', () => {
    it('handles concatenated messages, escaped braces, and UTF-8 split at every byte', async () => {
        const updated = { ...message, message: '你好 "{Child}" \\ { }' };
        const bytes = new TextEncoder().encode(` \n${JSON.stringify([message])}${JSON.stringify(updated)} \r\n[]`);
        const body = respond(Array.from(bytes, byte => Uint8Array.of(byte)));
        expect(await collect()).toEqual([[message], updated, []]);
        expect(body.locked).toBe(false);
    });

    it.each([
        ['invalid prefix', `unexpected${JSON.stringify(message)}`],
        ['truncated JSON', '{"id":'],
        ['invalid JSON', '{]'],
        ['null token', JSON.stringify({ ...message, tokens: [null] })],
        ['missing token name', JSON.stringify({ ...message, tokens: [{ text: { text: '' } }] })],
        ['invalid text value', JSON.stringify({ ...message, tokens: [{ name: 'Child', text: { text: 42 } }] })],
    ])('reports %s rather than silently accepting the connection', async (_, data) => {
        const body = respond([new TextEncoder().encode(data)]);
        await expect(collect()).rejects.toBeInstanceOf(StreamProtocolError);
        expect(body.locked).toBe(false);
    });

    it('rejects invalid UTF-8', async () => {
        respond([Uint8Array.of(0xff)]);
        await expect(collect()).rejects.toThrow('invalid UTF-8');
    });

    it('enforces the limit per JSON value, not per network chunk', async () => {
        const overhead = JSON.stringify({ ...message, message: '' }).length;
        const large = { ...message, message: 'x'.repeat(1_048_576 - overhead) };
        respond([new TextEncoder().encode(JSON.stringify(large) + JSON.stringify(large))]);
        expect(await collect()).toEqual([large, large]);
        respond([new TextEncoder().encode(JSON.stringify({ ...large, message: large.message + 'x' }))]);
        await expect(collect()).rejects.toThrow('1,048,576');
    });

    it('cancels the reader when the consumer stops early', async () => {
        const cancel = vi.fn();
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(JSON.stringify(message)));
            },
            cancel,
        });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
        const updates = streamMessages('http://localhost:1025', new AbortController().signal);
        expect((await updates.next()).value).toEqual(message);
        await updates.return(undefined);
        expect(cancel).toHaveBeenCalledOnce();
        expect(body.locked).toBe(false);
    });

    it('preserves HTTP status codes for retry decisions', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
        await expect(collect()).rejects.toMatchObject({ statusCode: 503 });
    });

    it('accepts token-free messages and the published timer and clock variants without losing configuration', async () => {
        const format = { hour: 'none', minute: 'short', second: 'long', millisecond: 'none' };
        const configuration = {
            id: { uuid: 'timer-1', index: 0, name: 'Service' },
            allows_overrun: true,
            count_down_to_time: { time_of_day: 3600, period: 'am' },
            elapsed: { start_time: 0, end_time: null },
        };
        const variants = [
            { name: 'Timer', timer: { configuration, format } },
            { name: 'Timer', timer: { configuration: { ...configuration, format } } },
            { name: 'Timer', timer: { ...configuration, format } },
            { name: 'Clock', clock: { format: { date: 'none', time: 'short', is_24_hours: true } } },
        ];
        const data = variants.map(token => ({ ...message, tokens: [token] }));
        respond([new TextEncoder().encode(JSON.stringify(data))]);
        expect(await collect()).toEqual([data]);
        for (const item of data) expect(createTriggerPayload(item, {})).toEqual(item.tokens);
        respond([new TextEncoder().encode(JSON.stringify({ ...message, tokens: undefined }))]);
        expect(await collect()).toEqual([{ ...message, tokens: [] }]);
    });

    it('propagates read failures', async () => {
        const failure = new Error('Connection reset');
        const body = new ReadableStream({ start(controller) { controller.error(failure); } });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
        await expect(collect()).rejects.toBe(failure);
        expect(body.locked).toBe(false);
    });

    it('preserves unknown token configuration and metadata through validation and triggering', async () => {
        const tokens = [
            { name: 'Child', uuid: 'text-id', text: { text: 'original', metadata: { font: 'custom' } } },
            { name: 'Timer', uuid: 'timer-id', timer: { futureLayout: { duration: 15 } }, extra: true },
            { name: 'Clock', clock: { futureFormat: 'custom' } },
            { name: 'Future token', custom: { nested: ['opaque', 123] } },
        ];
        respond([new TextEncoder().encode(JSON.stringify([{ ...message, tokens }]))]);
        const [updates] = await collect();
        if (!Array.isArray(updates)) throw new Error('Expected the message list');
        expect(updates[0].tokens).toEqual(tokens);
        expect(createTriggerPayload(updates[0], { Child: 'new' })).toEqual([
            { ...tokens[0], text: { text: 'new', metadata: { font: 'custom' } } },
            ...tokens.slice(1),
        ]);
    });
});

describe('message actions', () => {
    it('substitutes text values and preserves timer and clock configuration', () => {
        const original = { ...message, tokens: [...message.tokens, timer, clock] };
        const payload = createTriggerPayload(original, { Child: '$& {Clock}', Timer: 'ignored', Clock: 'ignored' });
        expect(payload).toEqual([{ name: 'Child', text: { text: '$& {Clock}' } }, timer, clock]);
        expect(original.tokens[0].text?.text).toBe('');
    });

    it('normalizes the server address and sends the API request shapes', async () => {
        vi.useFakeTimers();
        vi.spyOn(AbortSignal, 'any').mockImplementation(() => { throw new Error('Not available on Safari 16.4'); });
        vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => { throw new Error('Not available on Safari 16.4'); });
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
        vi.stubGlobal('fetch', fetch);
        const { signal } = new AbortController();
        await triggerMessage('http://host/proxy/', 'id/1', message.tokens, signal);
        expect(fetch).toHaveBeenNthCalledWith(1, 'http://host/proxy/v1/message/id%2F1/trigger', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.tokens),
        }));
        await clearMessage('http://host/proxy/', 'id/1', signal);
        expect(fetch).toHaveBeenNthCalledWith(2, 'http://host/proxy/v1/message/id%2F1/clear', expect.objectContaining({
            signal: expect.any(AbortSignal),
        }));
        expect(vi.getTimerCount()).toBe(0);
    });

    it('reports failed commands', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 400 })));
        await expect(clearMessage('http://host', 'id', new AbortController().signal)).rejects.toBeInstanceOf(StreamError);
    });

    it('does not report success when the session was cancelled during a request', async () => {
        const controller = new AbortController();
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
            controller.abort();
            return new Response(null, { status: 204 });
        }));
        await expect(triggerMessage('http://host', 'id', [], controller.signal))
            .rejects.toMatchObject({ name: 'AbortError' });
    });

    it('applies a 15-second timeout to commands without timing out the stream', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (_, init) => {
            const signal = init?.signal;
            if (!signal) throw new Error('Expected request cancellation');
            return new Promise<Response>((_, reject) => {
                signal.addEventListener('abort', () => reject(signal.reason), { once: true });
            });
        }));
        const pending = clearMessage('http://host', 'id', new AbortController().signal);
        const rejected = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
        await vi.advanceTimersByTimeAsync(15_000);
        await rejected;
        expect(vi.getTimerCount()).toBe(0);
        respond([new TextEncoder().encode('[]')]);
        await collect();
        expect(vi.getTimerCount()).toBe(0);
    });
});
