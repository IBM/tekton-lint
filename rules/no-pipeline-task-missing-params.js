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
};
