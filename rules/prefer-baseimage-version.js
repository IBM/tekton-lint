module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    for (const step of Object.values(task.spec.steps)) {
      if (/:latest$/.test(step.image)) {
        report(`Invalid base image version '${step.image}' for step '${step.name}' in Task '${task.metadata.name}'. Specify the base image version instead of ':latest', so Tasks can be consistent, and preferably immutable`, step, 'image');
      }
      if (/^[^:$]*$/.test(step.image)) {
        report(`Missing base image version '${step.image}' for step '${step.name}' in Task '${task.metadata.name}'. Specify the base image version, so Tasks can be consistent, and preferably immutable`, step, 'image');
      }
    }
  }
};
