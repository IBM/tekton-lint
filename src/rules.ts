import rules from './rule-loader';
import Reporter from './reporter';

const createReporter = (rule, config, reporter) => {
  const isError = config.rules[rule] && config.rules[rule] === 'error';

  return (message, node, prop) => {
    reporter.report(message, node, prop, isError, rule);
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

export function lint(docs, reporter, config) {
  docs = docs.filter(doc => doc && doc.metadata && doc.metadata.name);
  const tekton = parse(docs);

  if (Object.values(tekton).every((definitionKind => Object.keys(definitionKind).length === 0))) {
    throw Error('No tekton definitions can be found with the given paths');
  }

  reporter = reporter || new Reporter();
  config = config || {
    rules: {},
  };

  for (const [name, rule] of Object.entries(rules)) {
    const skipped = config.rules[name] && config.rules[name] === 'off';

    if (skipped) continue;

    const ruleReporter = createReporter(name, config, reporter);
    rule(docs, tekton, ruleReporter);
  }

  return reporter.problems;
};
