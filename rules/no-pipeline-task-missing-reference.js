const taskNameRegexp = /\$\(tasks\.(.*?)\..*?\)/;

module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.params) continue;
      for (const param of task.params) {
        if (typeof param.value !== 'string') continue;
        const taskReference = param.value.match(taskNameRegexp);
        if (taskReference) {
          const taskName = taskReference[1];
          const matchingTask = pipeline.spec.tasks.find(task => task.name === taskName);
          if (!matchingTask) {
            report(`Task '${task.name}' refers to task '${taskName}' at value of param '${param.name}' but there is no task with that name in pipeline '${pipeline.metadata.name}'`, param, 'value');
          }
        }
      }
    }
  }
};
