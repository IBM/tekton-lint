module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (task.taskRef) {
        const name = task.taskRef.name;
        if (!tekton.tasks[name]) continue;
        if (task.params) {
          const taskParamNames = new Set();
          for (const param of task.params) {
            if (!taskParamNames.has(param.name)) {
              taskParamNames.add(param.name);
            } else {
              report(`Pipeline '${pipeline.metadata.name}' invokes task '${task.name}' which references '${name}' with a duplicate param name: '${param.name}'.`, param, 'name');
            }
          }
        }
      }
    }
  }
};
