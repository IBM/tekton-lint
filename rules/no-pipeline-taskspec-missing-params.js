function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params;
  return spec.params;
}

module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
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
};
