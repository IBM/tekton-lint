const { walk } = require('../walk');

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
  for (const condition of Object.values(tekton.conditions)) {
    if (!condition.spec.params) continue;

    const occurences = Object.fromEntries(condition.spec.params.map(param => [param.name, 0]));
    walk(condition.spec.check, ['spec', 'check'], unused(condition.metadata.name, occurences, 'params'));

    for (const param of Object.keys(occurences)) {
      if (occurences[param]) continue;
      report(`Condition '${condition.metadata.name}' defines parameter '${param}', but it's not used anywhere in the Condition check`, condition.spec.params.find(p => p.name === param));
    }
  }
};
