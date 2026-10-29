// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import i18n from './i18n';
import { message } from './test/messages';
import { encodeUrlToBase64 } from './utils/urlEncoding';
import { APP_VERSION } from './utils/version';

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

function mockConnection() {
    window.history.replaceState(null, '', `?url=${encodeUrlToBase64('http://host')}`);
    const readers: ReadableStreamDefaultController<Uint8Array>[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input, init) => {
        if (!String(input).endsWith('chunked=true')) return new Response(null, { status: 204 });
        return new Response(new ReadableStream({
            start(controller) {
                readers.push(controller);
                controller.enqueue(new TextEncoder().encode(JSON.stringify([message])));
                init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true });
            },
        }));
    });
    vi.stubGlobal('fetch', fetch);
    return { fetch, readers };
}

describe('grouped message design', () => {
    it('keeps the application heading, empty guidance and version footer visible without a connection', () => {
        render(<App />);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Nursery messages');
        expect(screen.getByRole('status').textContent).toBe('Enter an address to load your messages.');
        expect(screen.getByRole('contentinfo').textContent).toBe(`Version ${APP_VERSION}`);
        expect(screen.getByLabelText('Enter connection to ProPresenter').getAttribute('dir')).toBe('ltr');
    });

    it('distinguishes draft previews from server-confirmed on-screen state', async () => {
        const { readers } = mockConnection();
        await act(async () => { render(<App />); });
        const draft = '$& <b>104</b>  extra space';
        fireEvent.change(screen.getByLabelText('Child'), { target: { value: draft } });
        const preview = document.querySelector('.preview-text');
        expect(preview?.textContent).toBe(`Please collect ${draft}.`);
        expect(preview?.querySelector('b')).toBeNull();
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Show' })));
        expect(screen.queryByText('On screen')).toBeNull();
        await act(async () => readers[0].enqueue(new TextEncoder().encode(JSON.stringify({ ...message, is_active: true }))));
        expect(screen.getByText('On screen')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Hide' })).toBeDefined();
        expect(preview?.textContent).toContain('<b>104</b>');
        expect(screen.getByRole('contentinfo').textContent).toBe(`Version ${APP_VERSION}`);
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
        expect(screen.queryByText(/is now shown/)).toBeNull();
    });

    it('keeps the old connection identifiable while editing an invalid replacement', async () => {
        const { fetch } = mockConnection();
        await act(async () => { render(<App />); });
        const address = screen.getByLabelText('Enter connection to ProPresenter');
        fireEvent.change(address, { target: { value: 'http://' } });
        expect(screen.getByRole('status').textContent).toBe('Address changing. Previous connection still active.');
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(screen.getByRole('alert').textContent).toContain('Previous connection still active.');
        expect(fetch).toHaveBeenCalledOnce();
        expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(false);
        fireEvent.change(address, { target: { value: 'http://host/' } });
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(screen.getByRole('status').textContent).toBe('Connected to ProPresenter.');
        expect(screen.queryByRole('alert')).toBeNull();
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('does not claim a previous active connection after a terminal failure', async () => {
        window.history.replaceState(null, '', `?url=${encodeUrlToBase64('http://host')}`);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
        await act(async () => { render(<App />); });
        fireEvent.change(screen.getByLabelText('Enter connection to ProPresenter'), { target: { value: 'http://' } });
        await act(async () => vi.advanceTimersByTimeAsync(500));
        expect(screen.getByRole('alert').textContent).not.toContain('Previous connection still active.');
        expect(screen.getByRole('alert').textContent).toContain('Failed to connect');
    });

    it('mirrors the interface without reversing addresses or message content', async () => {
        mockConnection();
        await act(async () => { render(<App />); });
        await act(async () => i18n.changeLanguage('ar'));
        expect(document.documentElement.dir).toBe('rtl');
        expect(screen.getByLabelText('أدخل الاتصال بـ ProPresenter').getAttribute('dir')).toBe('ltr');
        expect(screen.getByLabelText('Child').getAttribute('dir')).toBe('auto');
        expect(document.querySelector('.preview-text')?.getAttribute('dir')).toBe('auto');
        expect(within(screen.getByRole('contentinfo')).getByText(new RegExp(APP_VERSION))).toBeDefined();
    });
});
