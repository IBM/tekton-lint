module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    for (const step of Object.values(task.spec.steps)) {
      if (/:latest$/.test(step.image) || /^[^:$]*$/.test(step.image)) {
        report(`Invalid image: '${step.image}' for step '${step.name}' in Task '${task.metadata.name}'. Specify the image tag instead of using ':latest'`, step, 'image');
      }
    }
  }
};
