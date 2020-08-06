const { walk, pathToString } = require('../walk');

function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params;
  return spec.params;
}

const check_defined_params = (resource, params, prefix, report) => (node, path, parent) => {
  const r1 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`, 'g');
  const r2 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
  const m = node.toString().match(r1);
  if (!m) return;
  for (const item of m) {
    const m2 = item.match(r2);
    const param = m2[1];
    if (typeof params[param] === 'undefined') {
      report(`Undefined param '${param}' at ${pathToString(path)} in '${resource}'`, parent, path[path.length - 1]);
    }
  }
};

module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    const params = getTaskParams(task.spec);

    if (!params) continue;

    const occurences = Object.fromEntries(params.map(param => [param.name, 0]));

    walk(task.spec.steps, ['spec', 'steps'], check_defined_params(task.metadata.name, occurences, 'inputs.params', report));
    walk(task.spec.volumes, ['spec', 'volumes'], check_defined_params(task.metadata.name, occurences, 'inputs.params', report));
    walk(task.spec.stepTemplate, ['spec', 'stepTemplate'], check_defined_params(task.metadata.name, occurences, 'inputs.params', report));
    walk(task.spec.sidecars, ['spec', 'sidecars'], check_defined_params(task.metadata.name, occurences, 'inputs.params', report));
    walk(task.spec.steps, ['spec', 'steps'], check_defined_params(task.metadata.name, occurences, 'params', report));
    walk(task.spec.volumes, ['spec', 'volumes'], check_defined_params(task.metadata.name, occurences, 'params', report));
    walk(task.spec.stepTemplate, ['spec', 'stepTemplate'], check_defined_params(task.metadata.name, occurences, 'params', report));
    walk(task.spec.sidecars, ['spec', 'sidecars'], check_defined_params(task.metadata.name, occurences, 'params', report));
  }
};
