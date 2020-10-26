export default (docs, tekton, report) => {
  for (const task of Object.values<any>(tekton.tasks)) {
    if (task.spec.stepTemplate && task.spec.stepTemplate.env) {
      const templateEnvVars = new Set();
      for (const env of task.spec.stepTemplate.env) {
        if (!templateEnvVars.has(env.name)) {
          templateEnvVars.add(env.name);
        } else {
          report(`StepTemplate has env variable '${env.name}' duplicated in task '${task.metadata.name}'.`, env, 'name');
        }
      }
    }

    for (const step of task.spec.steps) {
      if (!step.env) continue;
      const envVariables = new Set();
      for (const env of step.env) {
        if (!envVariables.has(env.name)) {
          envVariables.add(env.name);
        } else {
          report(`Step '${step.name}' has env variable '${env.name}' duplicated in task '${task.metadata.name}'.`, env, 'name');
        }
      }
    }
  }
};
