module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
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
