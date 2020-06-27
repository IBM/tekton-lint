module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    const paramNames = new Set();
    for (const param of pipeline.spec.params) {
      if (!paramNames.has(param.name)) {
        paramNames.add(param.name);
      } else {
        report(`Pipeline '${pipeline.metadata.name}' has a duplicated parameter '${param.name}'.`, param, 'name');
      }
    }
  }
};
