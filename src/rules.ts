import rules from './rule-loader';
import Reporter from './reporter';
import {
  Task,
  EventListener,
  Pipeline,
  TriggerBinding,
  TriggerTemplate,
  TektonDefinitions,
  TektonDefinition,
} from './interfaces/index';
import Condition from './interfaces/pipeline/condition';

const createReporter = (rule, config, reporter: Reporter) => {
  const isError = config.rules[rule] && config.rules[rule] === 'error';

  return (message: string, node, prop) => {
    reporter.report(message, node, prop, isError, rule);
  };
};

const parse = (docs): TektonDefinitions => ({
  tasks: Object.fromEntries(docs
    .filter((item: Task) => item.kind === 'Task')
    .map((item: Task) => [item.metadata.name, item])),
  pipelines: Object.fromEntries(docs
    .filter((item: Pipeline) => item.kind === 'Pipeline')
    .map((item: Pipeline) => [item.metadata.name, item])),
  listeners: Object.fromEntries(docs
    .filter((item: EventListener) => item.kind === 'EventListener')
    .map((item: EventListener) => [item.metadata.name, item])),
  triggerTemplates: Object.fromEntries(docs
    .filter((item: TriggerTemplate) => item.kind === 'TriggerTemplate')
    .map((item: TriggerTemplate) => [item.metadata.name, item])),
  triggerBindings: Object.fromEntries(docs
    .filter((item: TriggerBinding) => item.kind === 'TriggerBinding')
    .map((item: TriggerBinding) => [item.metadata.name, item])),
  conditions: Object.fromEntries(docs
    .filter((item: Condition) => item.kind === 'Condition')
    .map((item: Condition) => [item.metadata.name, item])),
});

export function lint(docs: TektonDefinition[], reporter: Reporter, config) {
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
