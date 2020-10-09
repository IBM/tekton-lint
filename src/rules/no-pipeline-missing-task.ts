export default (docs, tekton, report) => {
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
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
