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

        if (params == null) {
            const provided = task.params.map(param => param.name);
            for (const param of provided) {
            report(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', and supplies parameter '${param}' to it, but it's not a valid parameter`, task.params.find(p => p.name === param));
          }
        } else if (task.params && task.params !== null) {
          const provided = task.params.map(param => param.name);
          const all = params.map(param => param.name);

          const extra = provided.filter(param => !all.includes(param));

          for (const param of extra) {
            report(`Pipeline '${pipeline.metadata.name}' references task '${task.name}', and supplies parameter '${param}' to it, but it's not a valid parameter`, task.params.find(p => p.name === param));
          }
        }
      }
    }
  }
};
