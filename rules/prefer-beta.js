module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.taskSpec) continue;
      switch (pipeline.apiVersion) {
        case 'tekton.dev/v1alpha1':
          if (task.taskSpec.params) report(`Pipeline '${pipeline.metadata.name}' is defined with apiVersion tekton.dev/v1alpha1, but defines an inlined task (${task.name}) with spec.params. Use spec.inputs.params instead.`, task.taskSpec.params);
          break;
        case 'tekton.dev/v1beta1':
          if (task.taskSpec.inputs && task.taskSpec.inputs.params) report(`Pipeline '${pipeline.metadata.name}' is defined with apiVersion tekton.dev/v1beta1, but defines an inlined task (${task.name}) with spec.inputs.params. Use spec.params instead.`, task.taskSpec.inputs.params);
          break;
      }
    }
  }

  for (const task of Object.values(tekton.tasks)) {
    switch (task.apiVersion) {
      case 'tekton.dev/v1alpha1':
        if (task.spec.params) report(`Task '${task.metadata.name}' is defined with apiVersion tekton.dev/v1alpha1, but defines spec.params. Use spec.inputs.params instead.`, task.spec.params);
        break;
      case 'tekton.dev/v1beta1':
        if (task.spec.inputs && task.spec.inputs.params) report(`Task '${task.metadata.name}' is defined with apiVersion tekton.dev/v1beta1, but defined spec.inputs.params. Use spec.params instead.`, task.spec.inputs.params);
        break;
    }
  }

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
