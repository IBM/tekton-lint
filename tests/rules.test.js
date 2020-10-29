const { default: lint } = require('../src/runner');

it('linter with no definitions should throw', async () => {
  await expect(lint([])).rejects.toThrow();
});
