module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const template of Object.values(tekton.triggerTemplates)) {
      const matchingResource = template.spec.resourcetemplates.find(item => item.spec && item.spec.pipelineRef && item.spec.pipelineRef.name === pipeline.metadata.name);
      if (!matchingResource) continue;
      const pipelineParams = pipeline.spec.params || [];
      const templateParams = matchingResource.spec.params || [];
      const extra = templateParams.filter(templateParam => !pipelineParams.some(pipelineParam => pipelineParam.name === templateParam.name));

      for (const param of extra) {
        report(`TriggerTemplate '${template.metadata.name}' references pipeline '${pipeline.metadata.name}', and supplies '${param.name}', but it's not a valid parameter.`, templateParams.find(p => p.name === param.name));
      }
    }
  }
};
