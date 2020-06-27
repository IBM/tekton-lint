module.exports = (docs, tekton, report) => {
  for (const triggerTemplate of Object.values(tekton.triggerTemplates)) {
    const resourceTemplates = triggerTemplate.spec.resourcetemplates;

    for (const resourceTemplate of resourceTemplates) {
      if (resourceTemplate.spec && resourceTemplate.spec.params && resourceTemplate.kind === 'PipelineRun') {
        const paramNames = new Set();
        for (const param of resourceTemplate.spec.params) {
          if (!paramNames.has(param.name)) {
            paramNames.add(param.name);
          } else {
            report(`PipelineRun '${resourceTemplate.metadata.name}' in TriggerTemplate '${triggerTemplate.metadata.name}' has a duplicate param name: '${param.name}'.`, param, 'name');
          }
        }
      }
    }
  }
};
