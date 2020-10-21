const { default: lint } = require('../lib/runner');

it('linter with no definitions should throw', async () => {
  await expect(lint([])).rejects.toThrow();
});
