const collect = require('../src/Collector').default;
const { default: runner, lint } = require('../src/runner');

it('regression tests with location', async () => {
  const result = await runner(['./regression-tests/*.yaml']);
  for (const problem of result) {
    expect(problem).toHaveProperty('loc');
  }

  result.sort((a, b) => {
    const start = a.loc.range[0] - b.loc.range[0];
    const end = a.loc.range[1] - b.loc.range[1];
    return a.path.localeCompare(b.path) || start || end || a.message.localeCompare(b.message);
  });

  expect(result).toMatchSnapshot();
});

it('regression tests without location', async () => {
  const reference = await runner(['./regression-tests/*.yaml']);
  const docs = await collect(['./regression-tests/*.yaml']);
  const result = await lint(docs.map(d => d.content));
  expect(result).toHaveLength(reference.length);
});
