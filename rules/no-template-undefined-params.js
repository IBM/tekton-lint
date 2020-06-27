const walk = require('../walk');

const check_defined_params = (resource, params, prefix, report) => (node, path, parent) => {
  const r1 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`, 'g');
  const r2 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
  const m = node.toString().match(r1);
  if (!m) return;
  for (const item of m) {
    const m2 = item.match(r2);
    const param = m2[1];
    if (typeof params[param] === 'undefined') {
      report(`Undefined param '${param}' at ${path} in '${resource}'`, parent, path.split('.').slice(-1)[0]);
    }
  }
};

module.exports = (docs, tekton, report) => {
  for (const template of Object.values(tekton.triggerTemplates)) {
    if (!template.spec.params) continue;

    const params = Object.fromEntries(template.spec.params.map(param => [param.name, 0]));

    for (const resourceTemplate of template.spec.resourcetemplates) {
      if (!resourceTemplate.spec) continue;

      walk(resourceTemplate, 'resourceTemplate', check_defined_params(resourceTemplate.metadata.name, params, 'params', report));
    }
  }
};
