export default (docs, tekton, report) => {
  const hashbangRegexp = /^#!(.*)/;
  for (const task of Object.values<any>(tekton.tasks)) {
    for (const step of task.spec.steps) {
      if (!step.script) continue;
      if (!hashbangRegexp.test(step.script)) {
        report(`Step script '${step.name}' in Task '${task.metadata.name}' should start with a hashbang line.`, step, 'script');
      }
    }
  }
};
