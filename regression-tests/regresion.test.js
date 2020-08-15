const collect = require('../Collector');
const rules = require('../rules');

it('regression tests with location', async () => {
  const result = await rules(['./regression-tests/*.yaml']);
  expect(result).toMatchSnapshot();
});

it('regression tests without location', async () => {
  const docs = await collect(['./regression-tests/*.yaml']);
  const result = await rules.lint(docs.map(d => d.content));
  expect(result).toMatchSnapshot();
});
