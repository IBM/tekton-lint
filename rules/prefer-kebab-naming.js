const walk = require('../walk');

const isValidName = (name) => {
  const valid = new RegExp('^[a-z0-9-()$.]*$');
  return valid.test(name);
};

const naming = (resource, prefix, report) => (node, path, parent) => {
  let name = node;
  const isNameDefinition = /.name$/.test(path);

  if (isNameDefinition && !isValidName(name)) {
    report(`Invalid name for '${name}' at ${path} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case format.`, parent, 'name');
    return;
  }

  const parameterPlacementRx = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
  const m = node && node.toString().match(parameterPlacementRx);

  if (m) {
    name = m[1];
    if (!isValidName(name)) {
      report(`Invalid name for '${name}' at ${path} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case format.`, parent, path.split('.').slice(-1)[0]);
    }
  }
};

module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    walk(pipeline.spec.tasks, 'spec.tasks', naming(pipeline.metadata.name, 'params', report));
  }
};
