// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CONFIG_TIMEOUT_MS,
  loadDefaultConnectionUrl,
  parseDefaultConnectionUrl,
  redirectToDefaultConnection,
} from './config'
import { encodeUrlToBase64 } from './urlEncoding'
import shippedConfig from '../../public/config.json?raw'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('parseDefaultConnectionUrl', () => {
  it('finds no address in the config.json that ships with the app', () => {
    expect(JSON.parse(shippedConfig)).toEqual({ defaultUrl: '' })
    expect(parseDefaultConnectionUrl(JSON.parse(shippedConfig))).toBe('')
  })

  it('normalizes a valid address', () => {
    expect(
      parseDefaultConnectionUrl({ defaultUrl: ' http://192.168.1.20:1025/ ' }),
    ).toBe('http://192.168.1.20:1025')
  })

  it.each([
    null,
    'http://192.168.1.20:1025',
    {},
    { defaultUrl: '' },
    { defaultUrl: 42 },
    { defaultUrl: 'ftp://192.168.1.20' },
    { defaultUrl: 'not an address' },
  ])('returns no address for %j', (config) => {
    expect(parseDefaultConnectionUrl(config)).toBe('')
  })
})

describe('loadDefaultConnectionUrl', () => {
  it('reads config.json next to the page without caching', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ defaultUrl: 'http://192.168.1.20:1025' }),
      )
    vi.stubGlobal('fetch', fetch)
    await expect(loadDefaultConnectionUrl()).resolves.toBe(
      'http://192.168.1.20:1025',
    )
    expect(fetch).toHaveBeenCalledWith('./config.json', {
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    })
  })

  it('logs the status of an error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    )
    await loadDefaultConnectionUrl()
    expect(console.error).toHaveBeenCalledWith('Ignoring config.json: HTTP 404')
  })

  it('gives up on a stalled request after the timeout', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_: string, { signal }: RequestInit) =>
            new Promise((_, reject) =>
              signal?.addEventListener('abort', () => reject(signal.reason)),
            ),
        ),
      )
      const load = loadDefaultConnectionUrl()
      await vi.advanceTimersByTimeAsync(CONFIG_TIMEOUT_MS - 1)
      let settled = false
      void load.then(() => (settled = true))
      await Promise.resolve()
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      await expect(load).resolves.toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives up on a stalled response body after the timeout', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_: string, { signal }: RequestInit) => {
          const body = new ReadableStream({
            start(stream) {
              signal?.addEventListener('abort', () =>
                stream.error(signal.reason),
              )
            },
          })
          return new Response(body)
        }),
      )
      const load = loadDefaultConnectionUrl()
      await vi.advanceTimersByTimeAsync(CONFIG_TIMEOUT_MS)
      await expect(load).resolves.toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    [
      'a missing file',
      () => Promise.resolve(new Response(null, { status: 404 })),
    ],
    ['invalid JSON', () => Promise.resolve(new Response('{'))],
    ['a network error', () => Promise.reject(new TypeError('offline'))],
  ])('returns no address for %s', async (_, respond) => {
    vi.stubGlobal('fetch', vi.fn(respond))
    await expect(loadDefaultConnectionUrl()).resolves.toBe('')
  })
})

describe('redirectToDefaultConnection', () => {
  const configured = () =>
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ defaultUrl: 'http://192.168.1.20:1025' }),
      )

  it('adds the default address and keeps other parameters and the fragment', async () => {
    window.history.replaceState(null, '', '/?lang=de#top')
    vi.stubGlobal('fetch', configured())
    await redirectToDefaultConnection()
    const page = new URL(window.location.href)
    expect(page.searchParams.get('url')).toBe(
      encodeUrlToBase64('http://192.168.1.20:1025'),
    )
    expect(page.searchParams.get('lang')).toBe('de')
    expect(page.hash).toBe('#top')
  })

  it('replaces the history entry instead of adding one', async () => {
    vi.stubGlobal('fetch', configured())
    const pushState = vi.spyOn(window.history, 'pushState')
    const length = window.history.length
    await redirectToDefaultConnection()
    expect(pushState).not.toHaveBeenCalled()
    expect(window.history.length).toBe(length)
  })

  it.each([`?url=${encodeUrlToBase64('http://host:1025')}`, '?url='])(
    'keeps the address the page URL already names (%s)',
    async (search) => {
      window.history.replaceState(null, '', `/${search}`)
      const fetch = configured()
      vi.stubGlobal('fetch', fetch)
      await redirectToDefaultConnection()
      expect(window.location.search).toBe(search)
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it('leaves the page URL alone without a default address', async () => {
    window.history.replaceState(null, '', '/?lang=de')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ defaultUrl: '' })),
    )
    await redirectToDefaultConnection()
    expect(window.location.search).toBe('?lang=de')
  })
})
