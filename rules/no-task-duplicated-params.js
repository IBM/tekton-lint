function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params;
  return spec.params;
}

module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    const params = getTaskParams(task.spec);
    if (!params) continue;
    const paramNames = new Set();
    for (const param of params) {
      if (!paramNames.has(param.name)) {
        paramNames.add(param.name);
      } else {
        report(`Task '${task.metadata.name}' has a duplicated param: '${param.name}'.`, param, 'name');
      }
    }
  }
};
