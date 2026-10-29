// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { decodeBase64ToUrl, encodeUrlToBase64, normalizeConnectionUrl, readConnectionUrl, writeConnectionUrl } from './urlEncoding';

describe('connection addresses', () => {
    it('round-trips Unicode addresses and accepts existing Base64 and legacy links', () => {
        const url = 'http://localhost:1025/你好';
        expect(decodeBase64ToUrl(encodeUrlToBase64(url))).toBe(url);
        expect(readConnectionUrl(`?url=${encodeUrlToBase64(url)}`)).toBe(url);
        expect(readConnectionUrl(`?url=${encodeURIComponent(url)}`)).toBe(url);
        expect(readConnectionUrl(`?url=${encodeURIComponent(encodeURIComponent(url))}`)).toBe(url);
        expect(readConnectionUrl('?url=%')).toBe('%');
    });

    it('does not decode percent escapes twice in a plain address', () => {
        const url = 'http://localhost:1025/path%2520name';
        expect(readConnectionUrl(`?url=${encodeURIComponent(url)}`)).toBe(url);
    });

    it('normalizes trailing slashes while retaining reverse-proxy prefixes', () => {
        expect(normalizeConnectionUrl(' http://HOST:1025/proxy/ ')).toBe('http://host:1025/proxy');
        expect(normalizeConnectionUrl('http://host/?#')).toBe('http://host');
    });

    it.each(['localhost', 'ftp://host', 'http://user:pass@host', 'http://host?key=value', 'http://host#fragment'])(
        'rejects unsupported server address %s', value => {
            expect(() => normalizeConnectionUrl(value)).toThrow();
        },
    );

    it('updates the connection link without adding history entries or losing other parameters', () => {
        window.history.replaceState(null, '', '/?other=value#anchor');
        const length = window.history.length;
        writeConnectionUrl('http://host:1025');
        expect(readConnectionUrl(window.location.search)).toBe('http://host:1025');
        expect(window.location.search).toContain('other=value');
        expect(window.location.hash).toBe('#anchor');
        expect(window.history.length).toBe(length);
        writeConnectionUrl('http://host:1025');
        expect(window.history.length).toBe(length);
        writeConnectionUrl('');
        expect(window.location.search).toBe('?other=value');
        expect(window.history.length).toBe(length);
    });
});
