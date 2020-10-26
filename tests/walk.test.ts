import { pathToString, walk } from '../src/walk';

describe.each([
    [[], ''],
    [['somepath'], '.somepath'],
    [[1, 'path'], '.[1].path'],
    [['some', 'path'], '.some.path'],
    [['some', 'other', '2'], '.some.other.2'],
    [['some', 'other', 2], '.some.other[2]'],
    [['some', 'other', 2, 'suffix'], '.some.other[2].suffix'],
    [['some', 'other', 2, 'suffix', 3, 'secondsuffix'], '.some.other[2].suffix[3].secondsuffix'],
])('path stringifier: ', (originalPath, expectedStringified) => {
    test(`${originalPath} should be ${expectedStringified}`, () => {
        expect(pathToString(originalPath)).toBe(expectedStringified);
    });
});

it('stringifying empty path should throw an error', () => {
    expect(() => pathToString(null)).toThrowError()
})

describe.each([
    [null, [], 0],
    [2, [], 1],
    ['two', [], 1],
    [{ node: 'node' }, ['node'], 1],
    [[], ['some', 'existsing', 'path'], 0],
    [['existingElement'], [], 1],
    [{ node: [] }, [], 0],
    [['existingElement', 'anotherExistingElement'], [], 2],
    [['existingElement', ['anotherExistingElement']], ['existing', 'path'], 2],
    [['existingElement', ['anotherExistingElement']], [], 2],
])('should work', (node, path, expectedVisitCalls) => {
    test(`Node ${JSON.stringify(node)} with path: ${path} should be visited ${expectedVisitCalls} times`, () => {
        const mockVisitorFn: jest.Mock<any, any> = jest.fn();
        walk(node, path, mockVisitorFn);
        expect(mockVisitorFn).toHaveBeenCalledTimes(expectedVisitCalls);
    });
});
