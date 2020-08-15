const collector = require('./Collector');
const Reporter = require('./reporter');
const { parse, getRulesConfig, createReporter } = require('./runner');
const rules = require('./rule-loader');

module.exports = async function run(globs) {
  const docs = await collector(globs);
  const reporter = new Reporter(docs);
  return module.exports.lint(docs.map(doc => doc.content), reporter);
};

module.exports.lint = function lint(docs, reporter) {
  reporter = reporter || new Reporter();
  const config = getRulesConfig();
  const tekton = parse(docs);

  function runRule(name) {
    const ruleReporter = createReporter(name, config, reporter);
    rules[name](docs, tekton, ruleReporter);
  }

  runRule('no-resource-redefine');
  runRule('no-resourceversion');
  runRule('prefer-beta-version');
  runRule('no-params-api-mix');
  runRule('no-pipeline-task-cycle');
  runRule('no-template-missing-pipeline');
  runRule('no-invalid-resource-name');
  runRule('no-wrong-param-type');
  runRule('prefer-baseimage-version');
  runRule('no-invalid-parameter-name');
  runRule('no-task-undefined-params');
  runRule('no-task-unused-params');
  runRule('no-condition-unused-params');
  runRule('no-task-duplicated-params');
  runRule('no-task-undefined-volume');
  runRule('no-task-step-duplicate-env');
  runRule('no-template-undefined-params');
  runRule('no-template-unused-params');
  runRule('no-listener-missing-template');
  runRule('no-listener-missing-binding');
  runRule('no-pipelinerun-duplicate-params');
  runRule('no-binding-duplicate-params');
  runRule('no-template-duplicate-params');
  runRule('no-pipeline-duplicate-params');
  runRule('no-pipeline-missing-task');
  runRule('no-pipeline-task-missing-params');
  runRule('no-pipeline-task-undefined-params');
  runRule('no-pipeline-extra-params');
  runRule('prefer-kebab-naming');
  runRule('no-pipeline-missing-condition');
  runRule('no-pipeline-task-duplicate-params');
  runRule('no-pipeline-task-extra-params');
  runRule('no-pipeline-taskspec-extra-params');
  runRule('no-pipeline-taskspec-missing-params');
  runRule('no-template-pipeline-extra-parameters');
  runRule('no-template-pipeline-missing-parameters');
  runRule('no-pipeline-task-missing-workspace');
  runRule('no-pipeline-task-missing-reference');
  runRule('no-template-pipeline-missing-workspace');
  runRule('no-binding-missing-params');
  runRule('no-pipeline-task-undefined-result');

  return reporter.problems;
};
