function getTaskParams(spec) {
  if (spec.inputs) return spec.inputs.params;
  return spec.params;
}

module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (task.taskRef) {
        const name = task.taskRef.name;

        if (!tekton.tasks[name]) continue;

        if (task.params) {
          const provided = task.params.map(param => param.name);
          const params = getTaskParams(tekton.tasks[name].spec);
          const all = params.map(param => param.name);
          const extra = provided.filter(param => !all.includes(param));

          for (const param of extra) {
            report(`Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), and supplies parameter '${param}' to it, but it's not a valid parameter`, task.params.find(p => p.name === param));
          }
        }
      }
    }
  }
};
