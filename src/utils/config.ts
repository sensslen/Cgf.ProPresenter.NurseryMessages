import {
  InvalidConnectionUrlError,
  normalizeConnectionUrl,
  writeConnectionUrl,
} from './urlEncoding'

const CONFIG_PATH = './config.json'

export function parseDefaultConnectionUrl(config: unknown): string {
  const value =
    typeof config === 'object' && config !== null && 'defaultUrl' in config
      ? config.defaultUrl
      : undefined
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    return normalizeConnectionUrl(value)
  } catch (error) {
    if (!(error instanceof InvalidConnectionUrlError)) throw error
    console.error('Ignoring invalid defaultUrl in config.json:', error)
    return ''
  }
}

// The page waits for this load before rendering, so a stalled request must not block it.
export const CONFIG_TIMEOUT_MS = 5_000

// The config file is optional; a missing or unreadable file means no default address.
export async function loadDefaultConnectionUrl(): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS)
  try {
    const response = await fetch(CONFIG_PATH, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      console.error(`Ignoring config.json: HTTP ${response.status}`)
      return ''
    }
    return parseDefaultConnectionUrl(await response.json())
  } catch (error) {
    console.error('Ignoring unreadable config.json:', error)
    return ''
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Redirects a page URL without a connection address to the configured default. Any `url`
 * parameter, even an empty one, is the operator's choice and stays untouched, as do all
 * other parameters and the fragment.
 */
export async function redirectToDefaultConnection(): Promise<void> {
  if (new URLSearchParams(window.location.search).has('url')) return
  const defaultUrl = await loadDefaultConnectionUrl()
  if (defaultUrl) writeConnectionUrl(defaultUrl)
}
