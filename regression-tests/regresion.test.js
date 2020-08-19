const collect = require('../Collector');
const runner = require('../runner');

it('regression tests with location', async () => {
  const result = await runner(['./regression-tests/*.yaml']);
  expect(result).toMatchSnapshot();
});

it('regression tests without location', async () => {
  const docs = await collect(['./regression-tests/*.yaml']);
  const result = await runner.lint(docs.map(d => d.content));
  expect(result).toMatchSnapshot();
});
