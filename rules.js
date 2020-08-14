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

  const unused = (resource, params, prefix) => (node, path, parent) => {
    const r1 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`, 'g');
    const r2 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
    const m = node.toString().match(r1);
    if (!m) return;
    for (const item of m) {
      const m2 = item.match(r2);
      const param = m2[1];
      if (typeof params[param] === 'undefined') {
        if (path.includes('taskSpec')) return;
        error(`Undefined param '${param}' at ${pathToString(path)} in '${resource}'`, parent, path[path.length - 1]);
      } else {
        params[param]++;
      }
    }
  };

  const isValidName = (name) => {
    const valid = new RegExp('^[a-z0-9-()$.]*$');
    return valid.test(name);
  };

  const naming = (resource, prefix) => (node, path, parent) => {
    let name = node;
    const isNameDefinition = /.name$/.test(path);

    if (path.includes('env') && path.includes('name')) return;

    if (isNameDefinition && !isValidName(name)) {
      warning(`Invalid name for '${name}' at ${pathToString(path)} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case format.`, parent, 'name');
      return;
    }

    const parameterPlacementRx = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
    const m = node && node.toString().match(parameterPlacementRx);

    if (m) {
      name = m[1];
      if (!isValidName(name)) {
        warning(`Invalid name for '${name}' at ${pathToString(path)} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case format.`, parent, path[path.length - 1]);
      }
    }
  };

  function getTaskParams(spec) {
    if (spec.inputs) return spec.inputs.params;
    return spec.params;
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

  for (const listener of Object.values(tekton.listeners)) {
    for (const trigger of listener.spec.triggers) {
      if (!trigger.binding) continue;
      const name = trigger.binding.name;
      if (!tekton.triggerBindings[name]) {
        error(`EventListener '${listener.metadata.name}' defines trigger binding '${name}', but the trigger binding is missing.`, trigger.binding, 'name');
      }
    }
  }

  for (const triggerTemplate of Object.values(tekton.triggerTemplates)) {
    const resourceTemplates = triggerTemplate.spec.resourcetemplates;

    for (const resourceTemplate of resourceTemplates) {
      if (resourceTemplate.spec && resourceTemplate.spec.params && resourceTemplate.kind === 'PipelineRun') {
        const paramNames = new Set();
        for (const param of resourceTemplate.spec.params) {
          if (!paramNames.has(param.name)) {
            paramNames.add(param.name);
          } else {
            error(`PipelineRun '${resourceTemplate.metadata.name}' in TriggerTemplate '${triggerTemplate.metadata.name}' has a duplicate param name: '${param.name}'.`, param, 'name');
          }
        }
      }
    }
  }

  for (const binding of Object.values(tekton.triggerBindings)) {
    const params = new Set();
    if (!binding.spec || !binding.spec.params) continue;
    for (const param of binding.spec.params) {
      if (!params.has(param.name)) {
        params.add(param.name);
      } else {
        error(`TriggerBinding '${binding.metadata.name}' has param '${param.name}' duplicated.`, param, 'name');
      }
    }
  }

  for (const template of Object.values(tekton.triggerTemplates)) {
    const params = new Set();
    if (!template.spec.params) continue;
    for (const param of template.spec.params) {
      if (!params.has(param.name)) {
        params.add(param.name);
      } else {
        error(`TriggerTemplate '${template.metadata.name}' has param '${param.name}' duplicated.`, param, 'name');
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    const paramNames = new Set();
    for (const param of pipeline.spec.params) {
      if (!paramNames.has(param.name)) {
        paramNames.add(param.name);
      } else {
        error(`Pipeline '${pipeline.metadata.name}' has a duplicated parameter '${param.name}'.`, param, 'name');
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.runAfter) continue;
      for (const dependency of task.runAfter) {
        const exists = pipeline.spec.tasks.some(task => task.name === dependency);
        const details = task.taskSpec ? 'defined in-line' : `referenced as '${task.taskRef.name}'`;
        if (!exists) error(`Pipeline '${pipeline.metadata.name}' uses task '${task.name}' (${details}), and it depends on '${dependency}', which doesn't exists (declared in runAfter)`, task.runAfter, task.runAfter.indexOf(dependency));
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    for (const task of Object.values(pipeline.spec.tasks)) {
      if (!task.params) continue;
      for (const param of Object.values(task.params)) {
        if (typeof param.value == 'undefined') {
          error(`Task '${task.name}' has a parameter '${param.name}' that doesn't have a value in pipeline '${pipeline.metadata.name}'.`, param, 'name');
        }
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    const params = Object.fromEntries(pipeline.spec.params.map(param => [param.name, 0]));

    walk(pipeline.spec.tasks, ['spec', 'tasks'], unused(pipeline.metadata.name, params, 'params'));

    for (const param of Object.keys(params)) {
      if (params[param]) continue;
      warning(`Pipeline '${pipeline.metadata.name}' defines parameter '${param}', but it's not used anywhere in the pipeline spec`, pipeline.spec.params.find(p => p.name === param));
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    walk(pipeline.spec.tasks, ['spec', 'tasks'], naming(pipeline.metadata.name, 'params'));
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.taskRef) continue;
      const name = task.taskRef.name;

      if (!tekton.tasks[name]) {
        error(`Pipeline '${pipeline.metadata.name}' references task '${name}' but the referenced task cannot be found. To fix this, include all the task definitions to the lint task for this pipeline.`, task.taskRef, 'name');
        continue;
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.conditions) continue;
      for (const condition of task.conditions) {
        const exists = Object.values(tekton.conditions).find(cond => cond.metadata.name === condition.conditionRef);
        if (!exists) {
          error(`Pipeline '${pipeline.metadata.name}' references Condition '${condition.conditionRef}' but the referenced Condition cannot be found. To fix this, include all the Condition definitions to the lint task for this pipeline.`, condition);
        }
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (task.taskRef) {
        const name = task.taskRef.name;
        if (!tekton.tasks[name]) continue;
        if (task.params) {
          const taskParamNames = new Set();
          for (const param of task.params) {
            if (!taskParamNames.has(param.name)) {
              taskParamNames.add(param.name);
            } else {
              error(`Pipeline '${pipeline.metadata.name}' invokes task '${task.name}' which references '${name}' with a duplicate param name: '${param.name}'.`, param, 'name');
            }
          }
          const provided = task.params.map(param => param.name);
          const params = getTaskParams(tekton.tasks[name].spec);
          const all = params.map(param => param.name);
          const required = params
            .filter(param => typeof param.default == 'undefined')
            .map(param => param.name);

          const extra = provided.filter(param => !all.includes(param));
          const missing = required.filter(param => !provided.includes(param));

          for (const param of extra) {
            error(`Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), and supplies parameter '${param}' to it, but it's not a valid parameter`, task.params.find(p => p.name === param));
          }

          for (const param of missing) {
            error(`Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), but parameter '${param}' is not supplied (it's a required param in '${name}')`, task.params);
          }
        }
      }

      if (task.taskSpec) {
        const params = getTaskParams(task.taskSpec);
        if (task.params == null && params == null) continue;

        if (task.params == null) {
          const required = params
            .filter(param => typeof param.default == 'undefined')
            .map(param => param.name);

          for (const param of required) {
            error(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', but parameter '${param}' is not supplied (it's a required param in '${task.name}')`, task);
          }
        } else if (params == null) {
          const provided = task.params.map(param => param.name);

          for (const param of provided) {
            error(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', and supplies parameter '${param}' to it, but it's not a valid parameter`, task.params.find(p => p.name === param));
          }
        } else {
          const provided = task.params.map(param => param.name);
          const all = params.map(param => param.name);
          const required = params
            .filter(param => typeof param.default == 'undefined')
            .map(param => param.name);

          const extra = provided.filter(param => !all.includes(param));
          const missing = required.filter(param => !provided.includes(param));

          for (const param of extra) {
            error(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', and supplies parameter '${param}' to it, but it's not a valid parameter`, task.params.find(p => p.name === param));
          }

          for (const param of missing) {
            error(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', but parameter '${param}' is not supplied (it's a required param in '${task.name}')`, task.params);
          }
        }
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const template of Object.values(tekton.triggerTemplates)) {
      const matchingResource = template.spec.resourcetemplates.find(item => item.spec && item.spec.pipelineRef && item.spec.pipelineRef.name === pipeline.metadata.name);
      if (!matchingResource) continue;
      const pipelineParams = pipeline.spec.params || [];
      const templateParams = matchingResource.spec.params || [];

      const missing = pipelineParams.filter(pipelineParam => !templateParams.some(templateParam => templateParam.name === pipelineParam.name) && typeof pipelineParam.default === 'undefined');
      const extra = templateParams.filter(templateParam => !pipelineParams.some(pipelineParam => pipelineParam.name === templateParam.name));
      for (const param of extra) {
        warning(`TriggerTemplate '${template.metadata.name}' references pipeline '${pipeline.metadata.name}', and supplies '${param.name}', but it's not a valid parameter.`, templateParams.find(p => p.name === param.name));
      }

      for (const param of missing) {
        error(`Pipeline '${pipeline.metadata.name}' references param '${param.name}', but it is not supplied in triggerTemplate '${template.metadata.name}'`, matchingResource);
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    const pipelineWorkspaces = pipeline.spec.workspaces || [];
    for (const task of pipeline.spec.tasks) {
      if (!task.workspaces) continue;
      for (const workspace of task.workspaces) {
        const matchingWorkspace = pipelineWorkspaces.find(({ name }) => name === workspace.workspace);
        if (!matchingWorkspace) {
          error(`Pipeline '${pipeline.metadata.name}' provides workspace '${workspace.workspace}' for '${workspace.name}' for Task '${task.name}', but '${workspace.workspace}' doesn't exists in '${pipeline.metadata.name}'`, workspace, 'workspace');
        }
      }
    }
  }

  const taskNameRegexp = /\$\(tasks\.(.*?)\..*?\)/;

  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.params) continue;
      for (const param of task.params) {
        if (typeof param.value !== 'string') continue;
        const taskReference = param.value.match(taskNameRegexp);
        if (taskReference) {
          const taskName = taskReference[1];
          const matchingTask = pipeline.spec.tasks.find(task => task.name === taskName);
          if (!matchingTask) {
            error(`Task '${task.name}' refers to task '${taskName}' at value of param '${param.name}' but there is no task with that name in pipeline '${pipeline.metadata.name}'`, param, 'value');
          }
        }
      }
    }
  }

  for (const task of Object.values(tekton.tasks)) {
    if (!task.spec.workspaces) continue;
    const taskName = task.metadata.name;
    const requiredWorkspaces = task.spec.workspaces.map(ws => ws.name);

    for (const pipeline of Object.values(tekton.pipelines)) {
      const matchingTaskRefs = pipeline.spec.tasks.filter(task => task.taskRef && task.taskRef.name === taskName);

      for (const taskRef of matchingTaskRefs) {
        const usedWorkspaces = taskRef.workspaces || [];

        for (const required of requiredWorkspaces) {
          if (!usedWorkspaces.find(ws => ws.name === required)) {
            error(`Pipeline '${pipeline.metadata.name}' references Task '${taskName}' (as '${taskRef.name}'), but provides no workspace for '${required}' (it's a required workspace in '${taskName}')`, taskRef.workspaces || taskRef);
          }
        }
      }
    }
  }

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
