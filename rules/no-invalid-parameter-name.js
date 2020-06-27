function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params;
  return spec.params;
}

module.exports = (docs, tekton, report) => {
  for (const template of Object.values(tekton.triggerTemplates)) {
    if (!template.spec.params) continue;
    for (const param of template.spec.params) {
      if (param.name && !/^[a-zA-Z_][a-zA-Z_\-0-9]*$/.test(param.name)) {
        report(`TriggerTemplate '${template.metadata.name}' defines parameter '${param.name}' with invalid parameter name (names are limited to alpha-numeric characters, '-' and '_' and can only start with alpha characters and '_')`, param, 'name');
      }
    }
  }
  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    for (const param of pipeline.spec.params) {
      if (param.name && !/^[a-zA-Z_][a-zA-Z_\-0-9]*$/.test(param.name)) {
        report(`Pipeline '${pipeline.metadata.name}' defines parameter '${param.name}' with invalid parameter name (names are limited to alpha-numeric characters, '-' and '_' and can only start with alpha characters and '_')`, param, 'name');
      }
    }
  }
  for (const task of Object.values(tekton.tasks)) {
    const params = getTaskParams(task.spec);
    if (!params) continue;

    for (const param of params) {
      if (param.name && !/^[a-zA-Z_][a-zA-Z_\-0-9]*$/.test(param.name)) {
        report(`Task '${task.metadata.name}' defines parameter '${param.name}' with invalid parameter name (names are limited to alpha-numeric characters, '-' and '_' and can only start with alpha characters and '_')`, param, 'name');
      }
    }
  }
};
