// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import i18n from './i18n';
import { message, timer } from './test/messages';
import { encodeUrlToBase64 } from './utils/urlEncoding';

beforeEach(async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/');
    await i18n.changeLanguage('en');
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('operator workflow', () => {
    it('preserves the typed address across pauses so a proxy path can be continued', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
        vi.stubGlobal('fetch', fetch);
        render(<App />);
        const input = screen.getByLabelText<HTMLInputElement>('Enter connection to ProPresenter');
        fireEvent.change(input, { target: { value: 'http://HOST:1025/' } });
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(input.value).toBe('http://HOST:1025/');
        expect(fetch).toHaveBeenLastCalledWith('http://host:1025/v1/messages?chunked=true', expect.anything());
        fireEvent.change(input, { target: { value: `${input.value}proxy/` } });
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(input.value).toBe('http://HOST:1025/proxy/');
        expect(fetch).toHaveBeenLastCalledWith('http://host:1025/proxy/v1/messages?chunked=true', expect.anything());
        expect(new URLSearchParams(window.location.search).get('url')).toBe(encodeUrlToBase64('http://host:1025/proxy'));
    });

    it('keeps the connection status and bookmark unchanged for equivalent address edits', async () => {
        window.history.replaceState(null, '', `?url=${encodeUrlToBase64('http://host:1025')}`);
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
        vi.stubGlobal('fetch', fetch);
        await act(async () => { render(<App />); });
        const replaceState = vi.spyOn(window.history, 'replaceState');
        const status = screen.getByRole('alert').textContent;
        const input = screen.getByLabelText<HTMLInputElement>('Enter connection to ProPresenter');
        fireEvent.change(input, { target: { value: 'http://HOST:1025/' } });
        expect(screen.getByRole('alert').textContent).toBe(status);
        expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(input.value).toBe('http://HOST:1025/');
        expect(fetch).toHaveBeenCalledOnce();
        expect(replaceState).not.toHaveBeenCalled();
    });

    it('connects automatically after typing pauses without adding history entries', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
        vi.stubGlobal('fetch', fetch);
        render(<App />);
        const historyLength = window.history.length;
        expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull();
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: 'http://one:1025' } });
        await act(async () => vi.advanceTimersByTimeAsync(499));
        expect(fetch).not.toHaveBeenCalled();
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: 'http://two:1025' } });
        await act(async () => vi.advanceTimersByTimeAsync(499));
        expect(fetch).not.toHaveBeenCalled();
        await act(async () => vi.advanceTimersByTimeAsync(1));
        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch).toHaveBeenLastCalledWith('http://two:1025/v1/messages?chunked=true', expect.anything());
        expect(window.history.length).toBe(historyLength);
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: 'http://two:1025/' } });
        await act(async () => vi.advanceTimersByTimeAsync(1000));
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('offers Retry only after a terminal failure and retries the same address', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
        vi.stubGlobal('fetch', fetch);
        render(<App />);
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: 'http://host' } });
        expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(screen.getByRole('alert')).toBeDefined();
        const historyLength = window.history.length;
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry' })));
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(window.history.length).toBe(historyLength);
    });

    it('cancels a pending connection when the address is cleared', async () => {
        const fetch = vi.fn();
        vi.stubGlobal('fetch', fetch);
        render(<App />);
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: 'http://host' } });
        await act(async () => vi.advanceTimersByTimeAsync(250));
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: '' } });
        await act(async () => vi.advanceTimersByTimeAsync(1000));
        expect(fetch).not.toHaveBeenCalled();
        expect(new URLSearchParams(window.location.search).has('url')).toBe(false);
    });

    it('validates incomplete addresses after typing pauses without making requests', async () => {
        const fetch = vi.fn();
        vi.stubGlobal('fetch', fetch);
        render(<App />);
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: 'http://' } });
        expect(screen.queryByRole('alert')).toBeNull();
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(screen.getByRole('alert')).toBeDefined();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('preserves drafts on updates, makes timers read-only, and submits show/hide payloads', async () => {
        window.history.replaceState(null, '', `?url=${encodeUrlToBase64('http://host')}`);
        const readers: ReadableStreamDefaultController<Uint8Array>[] = [];
        const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
            if (String(input).endsWith('chunked=true')) {
                return new Response(new ReadableStream({
                    start(controller) {
                        readers.push(controller);
                        init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true });
                    },
                }));
            }
            return new Response(null, { status: 204 });
        });
        vi.stubGlobal('fetch', fetch);
        render(<App />);
        const data = { ...message, tokens: [...message.tokens, timer] };
        await act(async () => readers[0].enqueue(new TextEncoder().encode(JSON.stringify([data]))));
        expect(screen.getByRole('status').textContent).toBe('Connected to ProPresenter.');
        expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
        fireEvent.change(screen.getByLabelText('Child'), { target: { value: '$& {Timer}' } });
        expect(screen.queryByLabelText('Timer')).toBeNull();
        expect(screen.getByText('Timer: Configured in ProPresenter')).toBeDefined();
        await act(async () => readers[0].enqueue(new TextEncoder().encode(JSON.stringify({ ...data, is_active: true }))));
        expect(screen.getByDisplayValue('$& {Timer}')).toBeDefined();
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Show again' })));
        expect(fetch).toHaveBeenLastCalledWith('http://host/v1/message/message-1/trigger', expect.anything());
        const body = fetch.mock.lastCall?.[1]?.body;
        if (typeof body !== 'string') throw new Error('Expected a JSON request body');
        expect(JSON.parse(body)).toEqual([{ name: 'Child', text: { text: '$& {Timer}' } }, timer]);
        expect(screen.getByText('Message "Please collect $& {Timer}." is now shown.')).toBeDefined();
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Hide' })));
        expect(fetch).toHaveBeenLastCalledWith('http://host/v1/message/message-1/clear', expect.anything());
    });

    it('updates the document language and direction for Arabic', async () => {
        render(<App />);
        await act(async () => i18n.changeLanguage('ar'));
        expect(document.documentElement.lang).toBe('ar');
        expect(document.documentElement.dir).toBe('rtl');
        expect(screen.getByLabelText('أدخل الاتصال بـ ProPresenter')).toBeDefined();
        await act(async () => i18n.changeLanguage('ja'));
        expect(document.documentElement.lang).toBe('en');
        expect(document.documentElement.dir).toBe('ltr');
    });

    it('disables pending actions and ignores their completion after disconnect', async () => {
        window.history.replaceState(null, '', `?url=${encodeUrlToBase64('http://host')}`);
        let finish: ((response: Response) => void) | undefined;
        const command = new Promise<Response>(resolve => { finish = resolve; });
        const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
            if (!String(input).endsWith('chunked=true')) return command;
            return new Response(new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode(JSON.stringify([message])));
                    init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true });
                },
            }));
        });
        vi.stubGlobal('fetch', fetch);
        await act(async () => { render(<App />); });
        fireEvent.click(screen.getByRole('button', { name: 'Show' }));
        expect(screen.getByRole('button', { name: 'Show' }).hasAttribute('disabled')).toBe(true);
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: '' } });
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
        await act(async () => {
            if (!finish) throw new Error('Expected a pending command');
            finish(new Response(null, { status: 204 }));
        });
        expect(screen.queryByText(/is now shown/)).toBeNull();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it.each(['constructor', 'toString', '__proto__'])('treats %s as a literal token name', async name => {
        window.history.replaceState(null, '', `?url=${encodeUrlToBase64('http://host')}`);
        const data = { ...message, message: `{${name}}`, tokens: [{ name, text: { text: '' } }] };
        const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
            if (!String(input).endsWith('chunked=true')) return new Response(null, { status: 204 });
            return new Response(new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode(JSON.stringify([data])));
                    init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true });
                },
            }));
        });
        vi.stubGlobal('fetch', fetch);
        await act(async () => { render(<App />); });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Show' })));
        expect(fetch.mock.lastCall?.[1]?.body).toBe(JSON.stringify([{ name, text: { text: '' } }]));
        fireEvent.change(screen.getByLabelText(name), { target: { value: '42' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Show' })));
        expect(fetch.mock.lastCall?.[1]?.body).toBe(JSON.stringify([{ name, text: { text: '42' } }]));
    });
});
