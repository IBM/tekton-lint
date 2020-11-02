const checkSteps = (steps, report) => {
  if (!Array.isArray(steps)) return;
  for (const step of steps) {
    if (!step.script) continue;
    if (!/^#!(.*)/.test(step.script)) {
      report(`Step script '${step.name}' should start with a hashbang line.`, step, 'script');
    }
  }
};

export default (docs, tekton, report) => {
  for (const task of Object.values<any>(tekton.tasks)) {
    checkSteps(task.spec.steps, report);
  }

  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.taskSpec) continue;
      checkSteps(task.taskSpec.steps, report);
    }
  }

  for (const template of Object.values<any>(tekton.triggerTemplates)) {
    for (const resourceTemplate of template.spec.resourcetemplates) {
      if (resourceTemplate.kind !== 'PipelineRun') continue;
      const pipelineSpec = resourceTemplate.spec.pipelineSpec;
      if (!pipelineSpec) continue;
      if (!Array.isArray(pipelineSpec.tasks)) continue;
      for (const task of pipelineSpec.tasks) {
        if (!task.taskSpec) continue;
        checkSteps(task.taskSpec.steps, report);
      }
    }
  }
};
