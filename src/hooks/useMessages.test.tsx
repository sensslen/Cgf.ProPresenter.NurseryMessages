// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessages } from './useMessages';
import { message } from '../test/messages';

beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function mockStreams() {
    const readers: ReadableStreamDefaultController<Uint8Array>[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_, init) => new Response(
        new ReadableStream<Uint8Array>({
            start(controller) {
                readers.push(controller);
                init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true });
            },
        }),
    ));
    vi.stubGlobal('fetch', fetch);
    return { readers, fetch };
}

describe('connection lifetime', () => {
    it('keeps message order, reconnects after EOF, and preserves messages during retries', async () => {
        const { readers, fetch } = mockStreams();
        const { result } = renderHook(() => useMessages('http://host'));
        const other = { ...message, id: { ...message.id, uuid: 'second' } };
        await act(async () => readers[0].enqueue(new TextEncoder().encode(JSON.stringify([message, other]))));
        expect(result.current.status).toBe('connected');
        await act(async () => readers[0].enqueue(new TextEncoder().encode(JSON.stringify({ ...message, is_active: true }))));
        expect(result.current.messages.map(item => item.id.uuid)).toEqual(['message-1', 'second']);
        await act(async () => readers[0].close());
        expect(result.current.status).toBe('reconnecting');
        expect(result.current.messages).toHaveLength(2);
        await act(async () => vi.advanceTimersByTimeAsync(1000));
        expect(fetch).toHaveBeenCalledTimes(2);
        await act(async () => readers[1].enqueue(new TextEncoder().encode('[]')));
        expect(result.current.status).toBe('connected');
        expect(result.current.messages).toEqual([]);
    });

    it('backs off empty successful HTTP responses instead of resetting at the headers', async () => {
        const fetch = vi.fn().mockImplementation(async () => new Response(''));
        vi.stubGlobal('fetch', fetch);
        const { result, unmount } = renderHook(() => useMessages('http://host'));
        await act(async () => {});
        expect(result.current.status).toBe('reconnecting');
        for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
            const calls = fetch.mock.calls.length;
            await act(async () => vi.advanceTimersByTimeAsync(delay - 1));
            expect(fetch).toHaveBeenCalledTimes(calls);
            await act(async () => vi.advanceTimersByTimeAsync(1));
            expect(fetch).toHaveBeenCalledTimes(calls + 1);
        }
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it.each([400, 401, 403])('stops retrying terminal HTTP status %s', async status => {
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status }));
        vi.stubGlobal('fetch', fetch);
        const { result } = renderHook(() => useMessages('http://host'));
        await act(async () => {});
        expect(result.current.status).toBe('failed');
        expect(vi.getTimerCount()).toBe(0);
        expect(fetch).toHaveBeenCalledOnce();
    });

    it.each([404, 408, 429, 503])('retries transient HTTP status %s', async status => {
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status }));
        vi.stubGlobal('fetch', fetch);
        const { result } = renderHook(() => useMessages('http://host'));
        await act(async () => {});
        expect(result.current.status).toBe('reconnecting');
        await act(async () => vi.advanceTimersByTimeAsync(1000));
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('makes invalid payloads terminal', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...message, tokens: [null] }))));
        const { result } = renderHook(() => useMessages('http://host'));
        await act(async () => {});
        expect(result.current.status).toBe('failed');
        expect(vi.getTimerCount()).toBe(0);
    });

    it('rejects invalid addresses without starting a request or retry', async () => {
        const { fetch } = mockStreams();
        const { result } = renderHook(() => useMessages('ftp://host'));
        await act(async () => {});
        expect(result.current.status).toBe('failed');
        expect(fetch).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('aborts old streams and clears messages when the address changes', async () => {
        const { readers, fetch } = mockStreams();
        const { result, rerender, unmount } = renderHook(({ url }) => useMessages(url), { initialProps: { url: 'http://one' } });
        await act(async () => readers[0].enqueue(new TextEncoder().encode(JSON.stringify([message]))));
        const firstSignal = fetch.mock.calls[0][1]?.signal;
        rerender({ url: 'http://two' });
        expect(firstSignal?.aborted).toBe(true);
        expect(result.current.messages).toEqual([]);
        expect(result.current.status).toBe('connecting');
        await act(async () => readers[1].enqueue(new TextEncoder().encode('[]')));
        unmount();
        expect(fetch.mock.calls[1][1]?.signal?.aborted).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('does not leave an extra connection or retry after StrictMode cleanup', async () => {
        const { readers, fetch } = mockStreams();
        const { result, unmount } = renderHook(() => useMessages('http://host'), { wrapper: StrictMode });
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
        await act(async () => readers[1].enqueue(new TextEncoder().encode('[]')));
        expect(result.current.status).toBe('connected');
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});
