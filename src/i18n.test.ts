import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';

const translations = import.meta.glob<Record<string, unknown>>('../locales/*.json', { eager: true, import: 'default' });
function keys(value: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(value).flatMap(([key, item]) =>
        item && typeof item === 'object'
            ? keys(Object.fromEntries(Object.entries(item)), `${prefix}${key}.`)
            : [`${prefix}${key}`],
    ).sort();
}

describe('translation completeness', () => {
    it.each(Object.entries(translations))('%s has every English key', (_, translation) => {
        expect(keys(translation)).toEqual(keys(en));
    });
});
