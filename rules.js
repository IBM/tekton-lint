const collector = require('./Collector');
const Reporter = require('./reporter');
const runner = require('./runner');

module.exports = async function run(globs) {
  const docs = await collector(globs);
  const reporter = new Reporter(docs);
  return module.exports.lint(docs.map(doc => doc.content), reporter);
};

module.exports.lint = function lint(docs, reporter) {
  reporter = reporter || new Reporter();
  return runner.lint(docs, reporter);
};
