module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.taskRef) continue;
      const name = task.taskRef.name;

      if (!tekton.tasks[name]) {
        report(`Pipeline '${pipeline.metadata.name}' references task '${name}' but the referenced task cannot be found. To fix this, include all the task definitions to the lint task for this pipeline.`, task.taskRef, 'name');
        continue;
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.runAfter) continue;

      for (const dependency of task.runAfter) {
        const exists = pipeline.spec.tasks.some(task => task.name === dependency);
        const details = task.taskSpec ? 'defined in-line' : `referenced as '${task.taskRef.name}'`;

        if (!exists) {
          report(`Pipeline '${pipeline.metadata.name}' uses task '${task.name}' (${details}), and it depends on '${dependency}', which doesn't exists (declared in runAfter)`, task.runAfter, task.runAfter.indexOf(dependency));
        }
      }
    }
  }
};
