module.exports = (docs, tekton, report) => {
  for (const template of Object.values(tekton.triggerTemplates)) {
    const params = new Set();
    if (!template.spec.params) continue;
    for (const param of template.spec.params) {
      if (!params.has(param.name)) {
        params.add(param.name);
      } else {
        report(`TriggerTemplate '${template.metadata.name}' has param '${param.name}' duplicated.`, param, 'name');
      }
    }
  }
};
