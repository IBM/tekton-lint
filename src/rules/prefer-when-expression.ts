export default (docs, tekton, report) => {
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (task.conditions) {
        const guardedBy = task.conditions.map(condition => condition.conditionRef);
        report(`Task '${task.name}' in Pipeline '${pipeline.metadata.name}' is guarded by condition(s) ('${guardedBy.join(', ')}'). Conditions are deprecated, use WhenExpressions instead.`, task, 'conditions');
      }
    }
  }

  for (const triggerTemplate of Object.values<any>(tekton.triggerTemplates)) {
    for (const crd of triggerTemplate.spec.resourcetemplates) {
      if (crd.kind !== 'PipelineRun') continue;
      const pipelineSpec = crd.spec.pipelineSpec;
      if (!pipelineSpec || !pipelineSpec.tasks) continue;
      for (const task of pipelineSpec.tasks) {
        if (task.conditions) {
          const guardedBy = task.conditions.map(condition => condition.conditionRef);
          report(`Task '${task.name}' in PipelineRun '${crd.metadata.name}' is guarded by condition(s) ('${guardedBy.join(', ')}'). Conditions are deprecated, use WhenExpressions instead.`, task, 'conditions');
        }
      }
    }
  }
};
