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

for (const task of Object.values(tekton.tasks)) {
  const params = Object.fromEntries(task.spec.inputs.params.map(param => [param.name, 0]));

  const unused = (node, path) => {
    const m = node.match(/\$\(inputs.params.(.*?)\)/g);
    if (!m) return;
    for (const item of m) {
      const m2 = item.match(/\$\(inputs.params.(.*?)\)/);
      const param = m2[1];
      if (typeof params[param] === 'undefined') {
        console.log('!!!', param, params);
      } else {
        params[param]++;
      }
    }
  };

  walk(task.spec.steps, 'spec.steps', unused);
  walk(task.spec.volumes, 'spec.volumes', unused);


  for (const param of Object.keys(params)) {
    if (params[param]) continue;
    console.log(`Task '${task.metadata.name}' defines parameter '${param}', but it's not used anywhere in the task spec`);
  }

  // for (const step of task.spec.steps) {
  //   if (!step.env) continue;
  //   for (const envSetting of step.env) {
  //     console.log(envSetting)
  //     const match = envSetting.value.match(/\$\(inputs.params.(.*?)\)/);
  //     console.log(match)
  //   }
  // }
}
