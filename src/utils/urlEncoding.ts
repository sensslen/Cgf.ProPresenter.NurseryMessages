/**
 * Encodes a URL string to URL-safe Base64 format for safe URL parameter usage
 * Uses URL-safe Base64 encoding (RFC 4648 §5) by replacing + with -, / with _, and removing padding =
 * @param url - The URL string to encode
 * @returns URL-safe Base64 encoded string
 */
export const encodeUrlToBase64 = (url: string): string => {
  try {
    // Use btoa for browser-compatible Base64 encoding
    // First encode to handle UTF-8 characters properly
    const utf8Bytes = new TextEncoder().encode(url);
    const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    const base64 = btoa(binaryString);
    // Convert to URL-safe Base64 by replacing + with -, / with _, and removing padding =
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (error) {
    console.error('Error encoding URL to Base64:', error);
    throw new Error('Failed to encode URL to Base64');
  }
};

/**
 * Decodes a URL-safe Base64 encoded URL string
 * Handles both URL-safe and standard Base64 formats
 * @param encodedUrl - The Base64 encoded URL string
 * @returns Decoded URL string
 */
export const decodeBase64ToUrl = (encodedUrl: string): string => {
  try {
    // Convert URL-safe Base64 back to standard Base64
    let base64 = encodedUrl.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if necessary
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    // Use atob for browser-compatible Base64 decoding
    const binaryString = atob(base64);
    const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.error('Error decoding Base64 to URL:', error);
    throw new Error('Failed to decode Base64 to URL');
  }
};
