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
  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    const params = Object.fromEntries(pipeline.spec.params.map(param => [param.name, 0]));

    walk(pipeline.spec.tasks, ['spec', 'steps'], unused(pipeline.metadata.name, params, 'params'));
    for (const param of Object.keys(params)) {
      if (params[param]) continue;
      report(`Pipeline '${pipeline.metadata.name}' defines parameter '${param}', but it's not used anywhere in the pipeline spec`, pipeline.spec.params.find(p => p.name === param));
    }
  }
};
