#!/usr/bin/env node

const { version } = require('./package.json');
const yaml = require('js-yaml');
const fs = require('fs');
const glob = require('fast-glob');
const collectResources = require('./collect-resources')

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

const docs = [];
const files = glob.sync(process.argv.slice(2));

for (const file of files) {
  for (const doc of yaml.safeLoadAll(fs.readFileSync(file, 'utf-8'))) {
    docs.push(doc);
  }
}

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

const validateRunAfterTaskSteps = (pipelineName, pipelineTasks) => {
  const isTaskExists = step => pipelineTasks.map(task => task.name).includes(step);

  pipelineTasks.forEach(({ runAfter, name, taskRef }) => {
    if (!runAfter) return;

    runAfter.forEach(step => {
      if (step === name) console.log(`Pipeline '${pipelineName}' defines task '${taskRef.name}' (as '${name}'), but it's runAfter step '${step}' cannot be itself.`);
      if (!isTaskExists(step)) console.log(`Pipeline '${pipelineName}' defines task '${taskRef.name}' (as '${name}'), but it's runAfter step '${step}' not exist.`);
    });
  });
}

const isValidName = (name) => {
  const valid = new RegExp(`^[a-z0-9\-\(\)\$]*$`);
  return valid.test(name)
}

const naming = (resource, prefix) => (node, path) => {
  let name = node
  const isNameDefinition = /.name$/.test(path)

  if (isNameDefinition && !isValidName(name)) {
    console.log(`Invalid name for '${name}' at ${path} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case format.`);
    return
  }

  const parameterPlacementRx = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
  const m = node.match(parameterPlacementRx);

  if (m) {
    name = m[1]
    if (!isValidName(name)) {
      console.log(`Invalid name for '${name}' at ${path} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case format.`);
    }
  }
}

const resources = collectResources(docs);

Object.entries(resources).map(([type, resourceList]) => {
  Object.entries(resourceList).forEach(([name, resource]) => {
    if (!isValidName(resource.metadata.name)) {
      console.log(`Invalid name for ${type} '${resource.metadata.name}'. Names should be in lowercase, alphanumeric, kebab-case format.`);
    }
  });
});

for (const task of Object.values(tekton.tasks)) {
  if (!task.spec) continue;

  for (const step of Object.values(task.spec.steps)) {
    const {
      image,
      name: stepName
    } = step
    const { name: taskName } = task.metadata

    if (/:latest$/.test(image)) {
      console.log(`Invalid base image version '${image}' for step '${stepName}' in Task '${taskName}'. Specify the base image version instead of ':latest', so Tasks can be consistent, and preferably immutable`);
    }
    if (/^[^:]*$/.test(image)) {
      console.log(`Missing base image version '${image}' for step '${stepName}' in Task '${taskName}'. Specify the base image version, so Tasks can be consistent, and preferably immutable`);
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
  for (const step of Object.values(task.spec.steps)) {
    if (typeof step.volumeMounts === 'undefined') continue;

    for (const { name } of Object.values(step.volumeMounts)) {
      if (!volumes.includes(name)) {
        console.log(`Task '${task.metadata.name}' wants to mount volume '${name}' in step '${step.name}', but this volume is not defined.`)
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

for (const listener of Object.values(tekton.listeners)) {
  for (const [index, trigger] of Object.entries(listener.spec.triggers)) {
    if (!trigger.template) continue;
    const name = trigger.template.name;
    if (!tekton.triggerTemplates[name]) {
      console.log(`EventListener '${listener.metadata.name}' defines trigger template '${name}', but the trigger template is missing.`)
      continue;
    }
  }
  for (const [index, trigger] of Object.entries(listener.spec.triggers)) {
    if (!trigger.binding) continue;
    const name = trigger.binding.name;
    if (!tekton.triggerBindings[name]) {
      console.log(`EventListener '${listener.metadata.name}' defines trigger binding '${name}', but the trigger binding is missing.`)
      continue;
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
      console.log(`TriggerBinding '${binding.metadata.name}' has param '${name}' duplicated.`)
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
      console.log(`TriggerTemplate '${template.metadata.name}' has param '${name}' duplicated.`)
    }
  }
}

for (const pipeline of Object.values(tekton.pipelines)) {
  if (pipeline.spec.params) {
    const paramNames = new Set();
    for (const { name } of pipeline.spec.params) {
      if (!paramNames.has(name)) {
        paramNames.add(name);
      } else {
        console.log(`Pipeline '${pipeline.metadata.name}' has a duplicated parameter '${name}'.`);
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

  for (const [index, task] of Object.entries(pipeline.spec.tasks)) {
    if (!task.taskRef) continue;
    const name = task.taskRef.name;

    if (task.params) {
      const taskParamNames = new Set();
      for (const param of task.params) {
        if (!taskParamNames.has(param.name)) {
          taskParamNames.add(param.name);
        } else {
          console.log(`Pipeline '${pipeline.metadata.name}' invokes task '${task.name}' which references '${name}' with a duplicate param name: '${param.name}'.`);
        }
      }
    }

    if (!tekton.tasks[name]) {
      console.log(`Pipeline '${pipeline.metadata.name}' references task '${name}' but the referenced task cannot be found. To fix this, include all the task definitions to the lint task for this pipeline.`);
      continue;
    }

    const provided = task.params.map(param => param.name);
    const all = tekton.tasks[name].spec.inputs.params
      .map(param => param.name);
    const required = tekton.tasks[name].spec.inputs.params
      .filter(param => typeof param.default == 'undefined')
      .map(param => param.name);

    const extra = provided.filter(p => !all.includes(p));
    const missing = required.filter(p => !provided.includes(p));

    for (const param of extra) {
      console.log(`Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), and supplies parameter '${param}' to it, but it's not a valid parameter`);
    }

    for (const param of missing) {
      console.log(`Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), but parameter '${param}' is not supplied (it's a required param in '${name}')`);
    }
  }

  for (const template of Object.values(tekton.triggerTemplates)) {
    for (const resourceTemplate of template.spec.resourcetemplates) {
      if (resourceTemplate.kind != 'PipelineRun') continue;
      if (!tekton.pipelines[resourceTemplate.spec.pipelineRef.name]) {
        console.log(`TriggerTemplate '${template.metadata.name}' references pipeline '${resourceTemplate.spec.pipelineRef.name}', but the referenced pipeline cannot be found.`);
      }
    }
    const matchingResource = template.spec.resourcetemplates.find(item => item.spec && item.spec.pipelineRef &&item.spec.pipelineRef.name === pipeline.metadata.name);
    if (matchingResource) {
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
