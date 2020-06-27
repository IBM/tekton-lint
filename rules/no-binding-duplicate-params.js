module.exports = (docs, tekton, report) => {
  for (const binding of Object.values(tekton.triggerBindings)) {
    const params = new Set();
    if (!binding.spec || !binding.spec.params) continue;
    for (const param of binding.spec.params) {
      if (!params.has(param.name)) {
        params.add(param.name);
      } else {
        report(`TriggerBinding '${binding.metadata.name}' has param '${param.name}' duplicated.`, param, 'name');
      }
    }
  }
};
