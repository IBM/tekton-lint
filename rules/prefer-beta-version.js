module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    if (task.apiVersion === 'tekton.dev/v1alpha1') {
      report(`Task '${task.metadata.name}' is defined with apiVersion tekton.dev/v1alpha1, consider migrating to tekton.dev/v1beta1`, task, 'apiVersion');
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    if (pipeline.apiVersion === 'tekton.dev/v1alpha1') {
      report(`Pipeline '${pipeline.metadata.name}' is defined with apiVersion tekton.dev/v1alpha1, consider migrating to tekton.dev/v1beta1`, pipeline, 'apiVersion');
    }
  }
};
