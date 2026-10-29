export function replaceAllTokens(message: string, tokenValues: Record<string, string>): string {
    const names = Object.keys(tokenValues);
    if (!names.length) return message;
    const alternatives = names.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    return message.replace(new RegExp(`\\{(${alternatives})\\}`, 'g'), (_, name: string) => tokenValues[name]);
}
