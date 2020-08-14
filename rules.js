const collector = require('./Collector');
const Reporter = require('./reporter');
const { walk, pathToString } = require('./walk');
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
  const warning = reporter.warning.bind(reporter);
  const error = reporter.error.bind(reporter);
  const tekton = parse(docs);

  function runRule(name) {
    const ruleReporter = createReporter(name, config, reporter);
    rules[name](docs, tekton, ruleReporter);
  }

  const resourceNames = new Map();
  for (const resource of docs) {
    if (!resourceNames.has(resource.kind)) resourceNames.set(resource.kind, new Set());
    const names = resourceNames.get(resource.kind);
    if (names.has(resource.metadata.name)) {
      error(`'${resource.metadata.name}' is already defined (as a '${resource.kind}')`, resource.metadata, 'name');
    }
    names.add(resource.metadata.name);
  }

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

  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.workspaces) continue;
    const required = pipeline.spec.workspaces.map(ws => ws.name);

    for (const template of Object.values(tekton.triggerTemplates)) {
      const pipelineRuns = template.spec.resourcetemplates.filter(item => item.spec && item.spec.pipelineRef && item.spec.pipelineRef.name === pipeline.metadata.name);

      for (const pipelineRun of pipelineRuns) {
        const provided = pipelineRun.spec.workspaces || [];

        for (const workspace of required) {
          if (!provided.find(ws => ws.name === workspace)) {
            error(`TriggerTemplate '${template.metadata.name}' references Pipeline '${pipeline.metadata.name}', but provides no workspace for '${workspace}' (it's a required workspace in '${pipeline.metadata.name}')`, pipelineRun.spec.workspaces || pipelineRun.spec);
          }
        }
      }
    }
  }

  for (const triggerBinding of Object.values(tekton.triggerBindings)) {
    if (!triggerBinding.spec || !triggerBinding.spec.params) continue;
    for (const param of triggerBinding.spec.params) {
      if (param.value === undefined) warning(`TriggerBinding '${triggerBinding.metadata.name}' defines parameter '${param.name}' with missing value`, param);
    }
  }

  const checkUndefinedResult = pipeline => (value, path, parent) => {
    const resultReference = value.toString().match(/\$\(tasks\.(.*?)\.results\.(.*?)\)/);
    if (!resultReference) return;

    const resultTask = resultReference[1];
    const resultName = resultReference[2];
    const matchingTask = pipeline.spec.tasks.find(task => task.name === resultTask);
    if (!matchingTask) return;

    let taskSpec;
    if (matchingTask.taskRef) {
      const matchingTaskSpec = Object.values(tekton.tasks).find(task => task.metadata.name === matchingTask.taskRef.name);
      if (!matchingTaskSpec) return;
      taskSpec = matchingTaskSpec.spec;
    } else {
      if (!matchingTask.taskSpec) return;
      taskSpec = matchingTask.taskSpec;
    }

    const matchingResult = taskSpec.results.find(result => result.name === resultName);
    if (!matchingResult) {
      error(`In Pipeline '${pipeline.metadata.name}' the value on path '${pathToString(path)}' refers to an undefined output result (as '${value}' - '${resultName}' is not a result in Task '${resultTask}')`, parent, path[path.length - 1]);
    }
  };

  for (const pipeline of Object.values(tekton.pipelines)) {
    walk(pipeline, [], checkUndefinedResult(pipeline));
  }

  return reporter.problems;
};
