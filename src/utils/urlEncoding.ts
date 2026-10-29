export class InvalidConnectionUrlError extends Error {}

export function normalizeConnectionUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new InvalidConnectionUrlError('Enter an absolute HTTP or HTTPS address');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new InvalidConnectionUrlError('Use an HTTP or HTTPS server address without credentials, query, or fragment');
  }
  url.search = '';
  url.hash = '';
  return url.href.replace(/\/+$/, '');
}

export const encodeUrlToBase64 = (url: string): string => {
  const bytes = new TextEncoder().encode(url);
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const decodeBase64ToUrl = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return new TextDecoder('utf-8', { fatal: true })
    .decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
};

export function readConnectionUrl(search: string): string {
  const value = new URLSearchParams(search).get('url') ?? '';
  if (!value || /^https?:\/\//i.test(value)) return value;
  try {
    return decodeBase64ToUrl(value);
  } catch {
    // Older links encoded the address with encodeURIComponent instead of Base64.
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
}

export function writeConnectionUrl(value: string): void {
  const address = new URL(window.location.href);
  if (value) address.searchParams.set('url', encodeUrlToBase64(value));
  else address.searchParams.delete('url');
  if (address.href !== window.location.href) window.history.replaceState(null, '', address);
}
