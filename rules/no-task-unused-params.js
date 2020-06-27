const walk = require('../walk');

function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params;
  return spec.params;
}

const unused = (resource, params, prefix) => (node) => {
  const r1 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`, 'g');
  const r2 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
  const m = node.toString().match(r1);

  if (!m) return;

  for (const item of m) {
    const m2 = item.match(r2);
    const param = m2[1];
    if (typeof params[param] !== 'undefined') {
      params[param]++;
    }
  }
};

module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    const params = getTaskParams(task.spec);
    if (!params) continue;

    const occurences = Object.fromEntries(params.map(param => [param.name, 0]));

    walk(task.spec.steps, 'spec.steps', unused(task.metadata.name, occurences, 'inputs.params'));
    walk(task.spec.volumes, 'spec.volumes', unused(task.metadata.name, occurences, 'inputs.params'));
    walk(task.spec.stepTemplate, 'spec.stepTemplate', unused(task.metadata.name, occurences, 'inputs.params'));
    walk(task.spec.sidecars, 'spec.sidecars', unused(task.metadata.name, occurences, 'inputs.params'));
    walk(task.spec.steps, 'spec.steps', unused(task.metadata.name, occurences, 'params'));
    walk(task.spec.volumes, 'spec.volumes', unused(task.metadata.name, occurences, 'params'));
    walk(task.spec.stepTemplate, 'spec.stepTemplate', unused(task.metadata.name, occurences, 'params'));
    walk(task.spec.sidecars, 'spec.sidecars', unused(task.metadata.name, occurences, 'params'));

    for (const param of Object.keys(occurences)) {
      if (occurences[param]) continue;
      report(`Task '${task.metadata.name}' defines parameter '${param}', but it's not used anywhere in the task spec`, params.find(p => p.name === param));
    }
  }
};
