function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params ?? [];
  return spec.params ?? [];
}

export default (docs, tekton, report) => {
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (task.taskRef) {
        const name = task.taskRef.name;
        if (!tekton.tasks[name]) continue;
        if (task.params) {
          const provided = task.params.map(param => param.name);
          const params = getTaskParams(tekton.tasks[name].spec);
          const required = params
            .filter(param => typeof param.default == 'undefined')
            .map(param => param.name);
          const missing = required.filter(param => !provided.includes(param));
          for (const param of missing) {
            report(`Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), but parameter '${param}' is not supplied (it's a required param in '${name}')`, task.params);
          }
        }
      }
    }
  }
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (task.taskSpec) {
        const params = getTaskParams(task.taskSpec);
        if (task.params == null && params == null) continue;

        if (task.params == null) {
          const required = params
            .filter(param => typeof param.default == 'undefined')
            .map(param => param.name);

          for (const param of required) {
            report(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', but parameter '${param}' is not supplied (it's a required param in '${task.name}')`, task);
          }
        } else if (params) {
          const provided = task.params.map(param => param.name);
          const required = params
            .filter(param => typeof param.default == 'undefined')
            .map(param => param.name);

          const missing = required.filter(param => !provided.includes(param));

          for (const param of missing) {
            report(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', but parameter '${param}' is not supplied (it's a required param in '${task.name}')`, task.params);
          }
        }
      }
    }
  }
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const template of Object.values<any>(tekton.triggerTemplates)) {
      const matchingResource = template.spec.resourcetemplates.find(item => item.spec && item.spec.pipelineRef && item.spec.pipelineRef.name === pipeline.metadata.name);
      if (!matchingResource) continue;
      const pipelineParams = pipeline.spec.params || [];
      const templateParams = matchingResource.spec.params || [];
      const missing = pipelineParams.filter(pipelineParam => !templateParams.some(templateParam => templateParam.name === pipelineParam.name) && typeof pipelineParam.default === 'undefined');

      for (const param of missing) {
        report(`Pipeline '${pipeline.metadata.name}' references param '${param.name}', but it is not supplied in triggerTemplate '${template.metadata.name}'`, matchingResource);
      }
    }
  }
};
