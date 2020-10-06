const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const collector = require('./Collector');
const Reporter = require('./reporter');
const rules = require('./rules');

const getRulesConfig = () => {
  const defaultRcFile = fs.readFileSync(path.resolve(__dirname, '.tektonlintrc.yaml'), 'utf8');
  const defaultConfig = yaml.parse(defaultRcFile);

  if (fs.existsSync('./.tektonlintrc.yaml')) {
    const customRcFile = fs.readFileSync('./.tektonlintrc.yaml', 'utf8');
    const customConfig = yaml.parse(customRcFile);
    customConfig.rules = { ...defaultConfig.rules, ...customConfig.rules };

    return customConfig;
  }

  return defaultConfig;
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
