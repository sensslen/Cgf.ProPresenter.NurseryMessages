/**
 * Utility function to replace all occurrences of tokens in a message string.
 * Used by both MessageItem.tsx and MessageList.tsx for consistent token substitution.
 * @param message The message string containing tokens in {tokenName} format
 * @param tokenValues Object mapping token names to their values
 * @returns The message string with all token occurrences replaced
 */
export const replaceAllTokens = (
    message: string,
    tokenValues: { [key: string]: string }
): string => {
    // Escape special regex characters to ensure token names are treated literally
    const escapeRegexChars = (str: string): string => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    let result = message;
    Object.entries(tokenValues).forEach(([name, value]) => {
        // Escape the token name to handle special regex characters (e.g., "amount.total")
        const escapedName = escapeRegexChars(name);
        // Use global regex to replace ALL occurrences of each token
        const regex = new RegExp(`\\{${escapedName}\\}`, 'g');
        result = result.replace(regex, value);
    });
    return result;
};
