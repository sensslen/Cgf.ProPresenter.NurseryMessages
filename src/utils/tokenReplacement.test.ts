import { describe, expect, it } from 'vitest';
import { replaceAllTokens } from './tokenReplacement';

describe('literal token substitution', () => {
    it('replaces every occurrence without interpreting values as tokens or replacement syntax', () => {
        expect(replaceAllTokens('{first} {second} {first}', { first: '{second}', second: '$&' }))
            .toBe('{second} $& {second}');
    });

    it('handles regex metacharacters and leaves unknown tokens unchanged', () => {
        expect(replaceAllTokens('{amount.total} {a+b} {other}', { 'amount.total': '12', 'a+b': '' }))
            .toBe('12  {other}');
        expect(replaceAllTokens('{Child}', {})).toBe('{Child}');
    });
});
