const checkParameterValues = (resourceName, resourceKind, params, report) => {
  for (const param of params) {
    const value = typeof param.default !== 'undefined' ? param.default : param.value;
    if (value != null) {
      if (typeof value === 'string') continue;
      if (Array.isArray(value) && value.every(element => typeof element === 'string')) continue;
      report(`${resourceKind} '${resourceName}' defines parameter '${param.name}' with wrong type (only strings and arrays of strings are allowed)`, param);
    }
  }
};

function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params;
  return spec.params;
}

export default (docs, tekton, report) => {
  for (const triggerBinding of Object.values<any>(tekton.triggerBindings)) {
    if (!triggerBinding.spec || !triggerBinding.spec.params) continue;
    for (const param of triggerBinding.spec.params) {
      if (param.value === undefined) report(`TriggerBinding '${triggerBinding.metadata.name}' defines parameter '${param.name}' with missing value`, param);
    }
  }

  for (const task of Object.values<any>(tekton.tasks)) {
    const params = getTaskParams(task.spec);
    if (!params) continue;
    checkParameterValues(task.metadata.name, task.kind, params, report);
  }

  for (const template of Object.values<any>(tekton.triggerTemplates)) {
    if (!template.spec.params) continue;
    checkParameterValues(template.metadata.name, template.kind, template.spec.params, report);
  }

  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    checkParameterValues(pipeline.metadata.name, pipeline.kind, pipeline.spec.params, report);
  }

  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    for (const task of Object.values<any>(pipeline.spec.tasks)) {
      if (!task.params) continue;
      for (const param of Object.values<any>(task.params)) {
        if (typeof param.value == 'undefined') {
          report(`Task '${task.name}' has a parameter '${param.name}' that doesn't have a value in pipeline '${pipeline.metadata.name}'.`, param, 'name');
        }
      }
    }
  }
};
