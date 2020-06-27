function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params;
  return spec.params;
}

module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.params) continue;
    for (const task of Object.values(pipeline.spec.tasks)) {
      if (!task.params) continue;
      for (const param of Object.values(task.params)) {
        if (typeof param.value == 'undefined') {
          report(`Task '${task.name}' has a parameter '${param.name}' that doesn't have a value in pipeline '${pipeline.metadata.name}'.`, param, 'name');
        }
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
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
};
