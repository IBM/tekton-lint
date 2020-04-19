#!/usr/bin/env node

const { version } = require('./package.json');
const collector = require('./Collector');
const collectResources = require('./collect-resources');

const usageMessage = `Usage:
tekton-lint <path-to-yaml-files>

Options:
$ tekton-lint --version # Show version number
$ tekton-lint --help    # Show help

Examples:
# Globstar matching
$ tekton-lint '**/*.yaml'

# Exact file path
$ tekton-lint my-pipeline.yaml my-task.yaml

# Multiple glob patterns
$ tekton-lint path/to/my/pipeline.yaml 'path/to/my/tasks/*.yaml'`;

if (process.argv[2]) {
  if (process.argv[2] === '--version') {
    return console.log(`Version: ${version}`);
  }
  if (process.argv[2] === '--help') {
    return console.log(usageMessage);
  }
} else {
  return console.log(usageMessage);
}

const docs = collector(process.argv.slice(2)).map(doc => doc.content);

const tekton = {
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
};

function walk(node, path, visitor) {
  if (typeof node === 'string' || typeof node === 'number') {
    visitor(node, path);
  } else if (Array.isArray(node)) {
    for (const [index, child] of Object.entries(node)) {
      walk(child, path + `[${index}]`, visitor);
    }
  } else {
    if (!node) return;
    for (const [key, value] of Object.entries(node)) {
      walk(value, path + `.${key}`, visitor);
    }
  }
}

const unused = (resource, params, prefix) => (node, path) => {
  const r1 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`, 'g');
  const r2 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
  const m = node.match(r1);
  if (!m) return;
  for (const item of m) {
    const m2 = item.match(r2);
    const param = m2[1];
    if (typeof params[param] === 'undefined') {
      console.log(`Undefined param '${param}' at ${path} in '${resource}'`);
    } else {
      params[param]++;
    }
  }
};

function checkEmptyKey(path, toCheck) {
  if (!toCheck && toCheck !== '') {
    console.error(`The following key${path} is empty please consider removing it`);
  } else if (typeof toCheck === 'object') {
    for (const [key, value] of Object.entries(toCheck)) {
      checkEmptyKey(`${path}${Array.isArray(toCheck) ? ` at position: ${key}` : `.${key}`}`, value);
    }
  }
}

checkEmptyKey('', tekton);

const checkMissingPipelines = (triggerTemplates, pipelines) => {
  for (const template of Object.values(triggerTemplates)) {
    for (const resourceTemplate of template.spec.resourcetemplates) {
      if (resourceTemplate.kind !== 'PipelineRun') continue;

      if (!pipelines[resourceTemplate.spec.pipelineRef.name]) {
        console.log(`TriggerTemplate '${template.metadata.name}' references pipeline '${resourceTemplate.spec.pipelineRef.name}', but the referenced pipeline cannot be found.`);
      }
    }
  }
};

const checkParameterValues = (resourceName, resourceKind, params) => {
  for (const param of params) {
    const value = param.default || param.value;
    if (value) {
      if (typeof value === 'string') continue;
      if (Array.isArray(value) && value.every(element => typeof element === 'string')) continue;
      console.log(`${resourceKind} '${resourceName}' defines parameter '${param.name}' with wrong value type (values should be of type 'string', 'array of strings')`);
    }
  }
};

checkMissingPipelines(tekton.triggerTemplates, tekton.pipelines);

const validateRunAfterTaskSteps = (pipelineName, pipelineTasks) => {
  const isTaskExists = step => pipelineTasks.map(task => task.name).includes(step);

  pipelineTasks.forEach(({ runAfter, name, taskRef }) => {
    if (!runAfter) return;

    runAfter.forEach((step) => {
      if (step === name) console.log(`Pipeline '${pipelineName}' defines task '${taskRef.name}' (as '${name}'), but it's runAfter step '${step}' cannot be itself.`);
      if (!isTaskExists(step)) console.log(`Pipeline '${pipelineName}' defines task '${taskRef.name}' (as '${name}'), but it's runAfter step '${step}' not exist.`);
    });
  });
};

const checkInvalidResourceKey = (invalidKey, resources) => {
  Object.entries(resources).forEach(([type, resourceList]) => {
    Object.entries(resourceList).forEach(([name, resource]) => {
      if (resource.metadata[invalidKey]) console.log(`Resource ${type} '${name}' has an invalid '${invalidKey}' key in its resource definition.`);
    });
  });
};

const isValidName = (name) => {
  const valid = new RegExp('^[a-z0-9-()$.]*$');
  return valid.test(name);
};

const naming = (resource, prefix) => (node, path) => {
  let name = node;
  const isNameDefinition = /.name$/.test(path);

  if (isNameDefinition && !isValidName(name)) {
    console.log(`Invalid name for '${name}' at ${path} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case format.`);
    return;
  }

  const parameterPlacementRx = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
  const m = node.match(parameterPlacementRx);

  if (m) {
    name = m[1];
    if (!isValidName(name)) {
      console.log(`Invalid name for '${name}' at ${path} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case format.`);
    }
  }
};

const resources = collectResources(docs);

checkInvalidResourceKey('resourceVersion', resources);

Object.entries(resources).forEach(([type, resourceList]) => {
  Object.values(resourceList).forEach((resource) => {
    if (!isValidName(resource.metadata.name)) {
      console.log(`Invalid name for ${type} '${resource.metadata.name}'. Names should be in lowercase, alphanumeric, kebab-case format.`);
    }
  });
});

for (const task of Object.values(tekton.tasks)) {
  if (!task.spec) continue;
  if (task.spec.inputs.params) {
    checkParameterValues(task.metadata.name, task.kind, task.spec.inputs.params);
  }

  for (const step of Object.values(task.spec.steps)) {
    if (/:latest$/.test(step.image)) {
      console.log(`Invalid base image version '${step.image}' for step '${step.name}' in Task '${task.metadata.name}'. Specify the base image version instead of ':latest', so Tasks can be consistent, and preferably immutable`);
    }
    if (/^[^:$]*$/.test(step.image)) {
      console.log(`Missing base image version '${step.image}' for step '${step.name}' in Task '${task.metadata.name}'. Specify the base image version, so Tasks can be consistent, and preferably immutable`);
    }
  }
  if (task.spec.inputs && task.spec.inputs.params === null) {
    continue;
  }

  for (const param of task.spec.inputs.params) {
    if (param.name && !/^[a-zA-Z_][a-zA-Z_\-0-9]*$/.test(param.name)) {
      console.log(`Task '${task.metadata.name}' defines parameter '${param.name}' with invalid parameter name (names are limited to alpha-numeric characters, '-' and '_' and can only start with alpha characters and '_')`);
    }
  }

  const params = Object.fromEntries(task.spec.inputs.params.map(param => [param.name, 0]));

  walk(task.spec.steps, 'spec.steps', unused(task.metadata.name, params, 'inputs.params'));
  walk(task.spec.volumes, 'spec.volumes', unused(task.metadata.name, params, 'inputs.params'));

  for (const param of Object.keys(params)) {
    if (params[param]) continue;
    console.log(`Task '${task.metadata.name}' defines parameter '${param}', but it's not used anywhere in the task spec`);
  }
}

for (const task of Object.values(tekton.tasks)) {
  let volumes = [];
  if (typeof task.spec.volumes !== 'undefined') {
    volumes = Object.values(task.spec.volumes).map(volume => volume.name);
  }
  if (task.spec.inputs.params) {
    const paramNames = new Set();
    for (const { name } of task.spec.inputs.params) {
      if (!paramNames.has(name)) {
        paramNames.add(name);
      } else {
        console.log(`Task '${task.metadata.name}' has a duplicated param: '${name}'.`);
      }
    }
  }
  for (const step of Object.values(task.spec.steps)) {
    if (typeof step.volumeMounts === 'undefined') continue;

    for (const { name } of Object.values(step.volumeMounts)) {
      if (!volumes.includes(name)) {
        console.log(`Task '${task.metadata.name}' wants to mount volume '${name}' in step '${step.name}', but this volume is not defined.`);
      }
    }
  }
}

for (const task of Object.values(tekton.tasks)) {
  for (const step of task.spec.steps) {
    if (!step.env) continue;
    const envVariables = new Set();
    for (const { name } of step.env) {
      if (!envVariables.has(name)) {
        envVariables.add(name);
      } else {
        console.log(`Step '${step.name}' has env variable '${name}' duplicated in task '${task.metadata.name}'.`);
      }
    }
  }
}

for (const template of Object.values(tekton.triggerTemplates)) {
  if (!template.spec.params) continue;
  checkParameterValues(template.metadata.name, template.kind, template.spec.params);
  const params = Object.fromEntries(template.spec.params.map(param => [param.name, 0]));
  for (const resourceTemplate of template.spec.resourcetemplates) {
    if (!resourceTemplate.spec) continue;
    walk(resourceTemplate, 'resourceTemplate', unused(resourceTemplate.metadata.name, params, 'params'));
  }
  for (const param of Object.keys(params)) {
    if (params[param]) continue;
    console.log(`TriggerTemplate '${template.metadata.name}' defines parameter '${param}', but it's not used anywhere in the resourceTemplates specs`);
  }
}

for (const listener of Object.values(tekton.listeners)) {
  for (const trigger of listener.spec.triggers) {
    if (!trigger.template) continue;
    const name = trigger.template.name;
    if (!tekton.triggerTemplates[name]) {
      console.log(`EventListener '${listener.metadata.name}' defines trigger template '${name}', but the trigger template is missing.`);
    }
  }

  for (const trigger of listener.spec.triggers) {
    if (!trigger.binding) continue;
    const name = trigger.binding.name;
    if (!tekton.triggerBindings[name]) {
      console.log(`EventListener '${listener.metadata.name}' defines trigger binding '${name}', but the trigger binding is missing.`);
    }
  }
}

for (const triggerTemplate of Object.values(tekton.triggerTemplates)) {
  const resourceTemplates = triggerTemplate.spec.resourcetemplates;

  for (const resourceTemplate of resourceTemplates) {
    if (resourceTemplate.spec && resourceTemplate.spec.params && resourceTemplate.kind === 'PipelineRun') {
      const paramNames = new Set();
      for (const { name } of resourceTemplate.spec.params) {
        if (!paramNames.has(name)) {
          paramNames.add(name);
        } else {
          console.log(`PipelineRun '${resourceTemplate.metadata.name}' in TriggerTemplate '${triggerTemplate.metadata.name}' has a duplicate param name: '${name}'.`);
        }
      }
    }
  }
}

for (const binding of Object.values(tekton.triggerBindings)) {
  const params = new Set();
  if (!binding.spec.params) continue;
  for (const { name } of binding.spec.params) {
    if (!params.has(name)) {
      params.add(name);
    } else {
      console.log(`TriggerBinding '${binding.metadata.name}' has param '${name}' duplicated.`);
    }
  }
}

for (const template of Object.values(tekton.triggerTemplates)) {
  const params = new Set();
  if (!template.spec.params) continue;
  for (const { name } of template.spec.params) {
    if (!params.has(name)) {
      params.add(name);
    } else {
      console.log(`TriggerTemplate '${template.metadata.name}' has param '${name}' duplicated.`);
    }
    if (name && !/^[a-zA-Z_][a-zA-Z_\-0-9]*$/.test(name)) {
      console.log(`TriggerTemplate '${template.metadata.name}' defines parameter '${name}' with invalid parameter name (names are limited to alpha-numeric characters, '-' and '_' and can only start with alpha characters and '_')`);
    }
  }
}

for (const pipeline of Object.values(tekton.pipelines)) {
  if (pipeline.spec.params) {
    checkParameterValues(pipeline.metadata.name, pipeline.kind, pipeline.spec.params);
    const paramNames = new Set();
    for (const { name } of pipeline.spec.params) {
      if (!paramNames.has(name)) {
        paramNames.add(name);
      } else {
        console.log(`Pipeline '${pipeline.metadata.name}' has a duplicated parameter '${name}'.`);
      }
      if (name && !/^[a-zA-Z_][a-zA-Z_\-0-9]*$/.test(name)) {
        console.log(`Pipeline '${pipeline.metadata.name}' defines parameter '${name}' with invalid parameter name (names are limited to alpha-numeric characters, '-' and '_' and can only start with alpha characters and '_')`);
      }
    }
  }

  for (const task of Object.values(pipeline.spec.tasks)) {
    if (task.params) {
      for (const param of Object.values(task.params)) {
        if (typeof param.value == 'undefined') {
          console.log(`Task '${task.name}' has a parameter '${param.name}' that doesn't have a value in pipeline '${pipeline.metadata.name}'.`);
        }
      }
    }
  }

  const params = pipeline.spec.params && Object.fromEntries(pipeline.spec.params.map(param => [param.name, 0]));

  validateRunAfterTaskSteps(pipeline.metadata.name, pipeline.spec.tasks);

  if (params) {
    walk(pipeline.spec.tasks, 'spec.steps', unused(pipeline.metadata.name, params, 'params'));
    walk(pipeline.spec.tasks, 'spec.steps', naming(pipeline.metadata.name, 'params'));

    for (const param of Object.keys(params)) {
      if (params[param]) continue;
      console.log(`Pipeline '${pipeline.metadata.name}' defines parameter '${param}', but it's not used anywhere in the pipeline spec`);
    }
  }

  for (const task of pipeline.spec.tasks) {
    if (task.taskRef) {
      const name = task.taskRef.name;

      if (!tekton.tasks[name]) {
        console.log(`Pipeline '${pipeline.metadata.name}' references task '${name}' but the referenced task cannot be found. To fix this, include all the task definitions to the lint task for this pipeline.`);
        continue;
      }

      if (task.params) {
        const taskParamNames = new Set();
        for (const param of task.params) {
          if (!taskParamNames.has(param.name)) {
            taskParamNames.add(param.name);
          } else {
            console.log(`Pipeline '${pipeline.metadata.name}' invokes task '${task.name}' which references '${name}' with a duplicate param name: '${param.name}'.`);
          }
        }
        const provided = task.params.map(param => param.name);
        const all = tekton.tasks[name].spec.inputs.params
          .map(param => param.name);
        const required = tekton.tasks[name].spec.inputs.params
          .filter(param => typeof param.default == 'undefined')
          .map(param => param.name);

        const extra = provided.filter(param => !all.includes(param));
        const missing = required.filter(param => !provided.includes(param));

        for (const param of extra) {
          console.log(`Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), and supplies parameter '${param}' to it, but it's not a valid parameter`);
        }

        for (const param of missing) {
          console.log(`Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), but parameter '${param}' is not supplied (it's a required param in '${name}')`);
        }
      }
    }

    if (task.taskSpec) {
      if (task.params == null && task.taskSpec.inputs.params == null) continue;

      if (task.params == null) {
        const required = task.taskSpec.inputs.params
        .filter(param => typeof param.default == 'undefined')
        .map(param => param.name);

        for (const param of required) {
          console.log(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', but parameter '${param}' is not supplied (it's a required param in '${task.name}')`);
        }
      } else if (task.taskSpec.inputs.params == null) {
          const provided = task.params.map(param => param.name);

          for (const param of provided) {
          console.log(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', and supplies parameter '${param}' to it, but it's not a valid parameter`);
        }
      } else {
        const provided = task.params.map(param => param.name);
        const all = task.taskSpec.inputs.params
          .map(param => param.name);
        const required = task.taskSpec.inputs.params
          .filter(param => typeof param.default == 'undefined')
          .map(param => param.name);

        const extra = provided.filter(param => !all.includes(param));
        const missing = required.filter(param => !provided.includes(param));

        for (const param of extra) {
          console.log(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', and supplies parameter '${param}' to it, but it's not a valid parameter`);
        }

        for (const param of missing) {
          console.log(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', but parameter '${param}' is not supplied (it's a required param in '${task.name}')`);
        }
      }
    }
  }

  for (const template of Object.values(tekton.triggerTemplates)) {
    const matchingResource = template.spec.resourcetemplates.find(item => item.spec && item.spec.pipelineRef && item.spec.pipelineRef.name === pipeline.metadata.name);
    if (matchingResource) {
      if (pipeline.spec.params == null || matchingResource.spec.params == null) continue;
      const pipelineParams = pipeline.spec.params;
      const templateParams = matchingResource.spec.params;

      const missing = pipelineParams.filter(pipelineParam => !templateParams.some(templateParam => templateParam.name === pipelineParam.name) && typeof pipelineParam.default === 'undefined');
      const extra = templateParams.filter(templateParam => !pipelineParams.some(pipelineParam => pipelineParam.name === templateParam.name));
      for (const param of extra) {
        console.log(`TriggerTemplate '${template.metadata.name}' defines parameter '${param.name}', but it's not used anywhere in the pipeline spec '${pipeline.metadata.name}'`);
      }

      for (const param of missing) {
        console.log(`Pipeline '${pipeline.metadata.name}' references param '${param.name}', but it is not supplied in triggerTemplate '${template.metadata.name}'`);
      }
    }
  }
}
