import { extractVariableRefs, resolveParamName } from '../src/utils.js';

describe('extractVariableRefs (T1)', () => {
    test.each([
        ['$(params.a)', [['a']]],
        ['$(params.a[0])', [['a', '0']]],
        ['$(params.a[*])', [['a', '*']]],
        ['$(params.a.key)', [['a', 'key']]],
        ["$(params['a'][*])", [['a', '*']]],
        ['$(params["a"].key)', [['a', 'key']]],
        ['x $(params.a) y $(params.b[1]) z', [['a'], ['b', '1']]],
        ['$(params.dotted.name)', [['dotted', 'name']]],
    ])('%s', (text, expected) => {
        expect(extractVariableRefs(text, 'params')).toEqual(expected);
    });

    test('ignores other prefixes and malformed references', () => {
        expect(extractVariableRefs('$(context.a) $(params.a[x]) $(params.) $(params.a', 'params')).toEqual([]);
    });

    test('handles pathological input quickly', () => {
        const text = '$(params.' + 'a['.repeat(50000);
        const start = Date.now();
        extractVariableRefs(text, 'params');
        expect(Date.now() - start).toBeLessThan(1000);
    });
});

describe('resolveParamName (T1)', () => {
    test('prefers the longest declared name', () => {
        expect(resolveParamName(['dotted', 'name'], ['dotted.name', 'dotted'])).toBe('dotted.name');
        expect(resolveParamName(['obj', 'key'], ['obj'])).toBe('obj');
        expect(resolveParamName(['nope', '0'], ['obj'])).toBeUndefined();
    });
});
