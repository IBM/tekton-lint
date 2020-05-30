const rules = require('../rules');

it('regression tests', async () => {
  const result = await rules(['./regression-tests/*.yaml']);
  expect(result).toMatchSnapshot();
});
