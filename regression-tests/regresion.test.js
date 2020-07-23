const collect = require('../Collector');
const rules = require('../rules');
const Reporter = require('../reporter');
const runner = require('../runner');
const { formatLine } = require('../utils');

it('regression tests with location', async () => {
  const result = await rules(['./regression-tests/*.yaml']);
  expect(result).toMatchSnapshot();
});

it('regression tests without location', async () => {
  const docs = await collect(['./regression-tests/*.yaml']);
  const result = await rules.lint(docs.map(d => d.content));
  expect(result).toMatchSnapshot();
});


it('regression tests to test rule splitting into files', async () => {
  const docs = await collect(['./regression-tests/*.yaml']);

  const expectedReporter = new Reporter(docs);
  const expected = rules.lint(docs.map(doc => doc.content), expectedReporter);
  const expectedLines = [];

  for (const problem of expected) {
    expectedLines.push(formatLine(problem));
  }

  const receivedReporter = new Reporter(docs);
  const received = runner.lint(docs.map(doc => doc.content), receivedReporter);
  const receivedLines = [];

  for (const problem of received) {
    receivedLines.push(formatLine(problem));
  }

  const missing = [];
  const additions = [];

  for (const expectedLine of expectedLines) {
    if (!receivedLines.includes(expectedLine)) {
      missing.push(expectedLine);
    }
  }

  for (const receivedLine of receivedLines) {
    if (!expectedLines.includes(receivedLine)) {
      additions.push(receivedLine);
    }
  }

  expect(missing).toHaveLength(0);
  expect(additions).toHaveLength(0);
});
