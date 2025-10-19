/**
 * Encodes a URL string to Base64 format for safe URL parameter usage
 * @param url - The URL string to encode
 * @returns Base64 encoded string
 */
export const encodeUrlToBase64 = (url: string): string => {
  try {
    // Use btoa for browser-compatible Base64 encoding
    // First encode to handle UTF-8 characters properly
    const utf8Bytes = new TextEncoder().encode(url);
    const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } catch (error) {
    console.error('Error encoding URL to Base64:', error);
    throw new Error('Failed to encode URL to Base64');
  }
};

/**
 * Decodes a Base64 encoded URL string
 * @param encodedUrl - The Base64 encoded URL string
 * @returns Decoded URL string
 */
export const decodeBase64ToUrl = (encodedUrl: string): string => {
  try {
    // Use atob for browser-compatible Base64 decoding
    const binaryString = atob(encodedUrl);
    const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.error('Error decoding Base64 to URL:', error);
    throw new Error('Failed to decode Base64 to URL');
  }
};
