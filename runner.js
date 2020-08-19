const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const collector = require('./Collector');
const Reporter = require('./reporter');
const rules = require('./rules');

const getRulesConfig = () => {
  let rcFile;
  if (fs.existsSync('./.tektonlintrc.yaml')) {
    rcFile = fs.readFileSync('./.tektonlintrc.yaml', 'utf8');
  } else {
    rcFile = fs.readFileSync(path.resolve(__dirname, '.tektonlintrc.yaml'), 'utf8');
  }
  return yaml.parse(rcFile);
};

module.exports = async function runner(globs) {
  const docs = await collector(globs);
  const reporter = new Reporter(docs);
  return module.exports.lint(docs.map(doc => doc.content), reporter);
};

module.exports.lint = function lint(docs, reporter) {
  reporter = reporter || new Reporter();
  const config = getRulesConfig();
  return rules.lint(docs, reporter, config);
};
