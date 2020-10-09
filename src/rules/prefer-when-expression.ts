export default (docs, tekton, report) => {
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (task.conditions) {
        const guardedBy = task.conditions.map(condition => condition.conditionRef);
        report(`Task '${task.name}' in Pipeline '${pipeline.metadata.name}' is guarded by condition(s) ('${guardedBy.join(', ')}'). Conditions are deprecated, use WhenExpressions instead.`, task, 'conditions');
      }
    }
  }
};
