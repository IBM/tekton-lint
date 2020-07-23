const fs = require('fs');
const yaml = require('yaml');
const collector = require('./Collector');
const Reporter = require('./reporter');
const rules = require('./rule-loader');

const getRulesConfig = () => {
  const rcFile = fs.readFileSync('./.tektonlintrc.yaml', 'utf8');
  return yaml.parse(rcFile);
};

const createReporter = (rule, rulesConfig, reportCollector) => {
  const isError = rulesConfig.rules[rule] && rulesConfig.rules[rule] === 'error';

  return (message, node, prop) => {
    reportCollector.report(message, node, prop, isError, rule);
  };
};

const parse = docs => ({
  tasks: Object.fromEntries(docs.filter(item => item.kind === 'Task').map(item => [
    item.metadata.name,
    item,
  ])),
  pipelines: Object.fromEntries(docs.filter(item => item.kind === 'Pipeline').map(item => [
    item.metadata.name,
    item,
  ])),
  listeners: Object.fromEntries(docs.filter(item => item.kind === 'EventListener').map(item => [
    item.metadata.name,
    item,
  ])),
  triggerTemplates: Object.fromEntries(docs.filter(item => item.kind === 'TriggerTemplate').map(item => [
    item.metadata.name,
    item,
  ])),
  triggerBindings: Object.fromEntries(docs.filter(item => item.kind === 'TriggerBinding').map(item => [
    item.metadata.name,
    item,
  ])),
  conditions: Object.fromEntries(docs.filter(item => item.kind === 'Condition').map(item => [
    item.metadata.name,
    item,
  ])),
});

module.exports = async function runner(globs) {
  const docs = await collector(globs);
  const reporter = new Reporter(docs);
  return module.exports.lint(docs.map(doc => doc.content), reporter);
};

module.exports.lint = function lint(docs, reporter) {
  const reporterInstance = reporter || new Reporter();
  const rulesConfig = getRulesConfig();
  const tekton = parse(docs);

  for (const ruleEntry of Object.entries(rules)) {
    const name = ruleEntry[0];
    const rule = ruleEntry[1];
    const skipped = rulesConfig.rules[name] && rulesConfig.rules[name] === 'off';

    if (skipped) continue;

    const ruleReporter = createReporter(name, rulesConfig, reporterInstance);
    rule(docs, tekton, ruleReporter);
  }

  return reporterInstance.problems;
};
