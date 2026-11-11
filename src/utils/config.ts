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

// The config file is optional; a missing or unreadable file means no default address.
export async function loadDefaultConnectionUrl(): Promise<string> {
  try {
    const response = await fetch(CONFIG_PATH, { cache: 'no-store' })
    if (!response.ok) return ''
    return parseDefaultConnectionUrl(await response.json())
  } catch (error) {
    console.error('Ignoring unreadable config.json:', error)
    return ''
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
