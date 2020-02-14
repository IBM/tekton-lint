const yaml = require('js-yaml');
const execSync = require('child_process').execSync;

const docs = yaml.safeLoadAll(execSync('cat .pipeline/*', {encoding: 'utf-8'}));

const tekton = {
  tasks: Object.fromEntries(docs.filter(item => item.kind === 'Task').map(item => [
    item.metadata.name,
    item,
  ])),
  pipelines: Object.fromEntries(docs.filter(item => item.kind === 'Pipeline').map(item => [
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

for (const task of Object.values(tekton.tasks)) {
  const params = Object.fromEntries(task.spec.inputs.params.map(param => [param.name, 0]));

  walk(task.spec.steps, 'spec.steps', unused(task.metadata.name, params, 'inputs.params'));
  walk(task.spec.volumes, 'spec.volumes', unused(task.metadata.name, params, 'inputs.params'));

  for (const param of Object.keys(params)) {
    if (params[param]) continue;
    console.log(`Task '${task.metadata.name}' defines parameter '${param}', but it's not used anywhere in the task spec`);
  }
}

for (const pipeline of Object.values(tekton.pipelines)) {
  const params = Object.fromEntries(pipeline.spec.params.map(param => [param.name, 0]));

  walk(pipeline.spec.tasks, 'spec.steps', unused(pipeline.metadata.name, params, 'params'));

  for (const param of Object.keys(params)) {
    if (params[param]) continue;
    console.log(`Pipeline '${pipeline.metadata.name}' defines parameter '${param}', but it's not used anywhere in the pipeline spec`);
  }

  for (const [index, task] of Object.entries(pipeline.spec.tasks)) {
    if (!task.taskRef) continue;
    const name = task.taskRef.name;
    if (!tekton.tasks[name]) continue;

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
}
