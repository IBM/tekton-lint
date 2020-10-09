export default (docs, tekton, report) => {
  for (const listener of Object.values<any>(tekton.listeners)) {
    for (const trigger of listener.spec.triggers) {
      if (!trigger.binding) continue;
      const name = trigger.binding.name;
      if (!tekton.triggerBindings[name]) {
        report(`EventListener '${listener.metadata.name}' defines trigger binding '${name}', but the trigger binding is missing.`, trigger.binding, 'name');
      }
    }
  }

  for (const listener of Object.values<any>(tekton.listeners)) {
    for (const trigger of listener.spec.triggers) {
      if (!trigger.template) continue;
      const name = trigger.template.name;
      if (!tekton.triggerTemplates[name]) {
        report(`EventListener '${listener.metadata.name}' defines trigger template '${name}', but the trigger template is missing.`, trigger.template, 'name');
      }
    }
  }

  for (const template of Object.values<any>(tekton.triggerTemplates)) {
    for (const resourceTemplate of template.spec.resourcetemplates) {
      if (resourceTemplate.kind !== 'PipelineRun') continue;
      if (resourceTemplate.spec.pipelineSpec) continue;

      const isRuntimeCreated = (/\$\([\S]*\)/g).test(resourceTemplate.spec.pipelineRef.name);
      if (isRuntimeCreated) continue;

      if (!tekton.pipelines[resourceTemplate.spec.pipelineRef.name]) {
        report(`TriggerTemplate '${template.metadata.name}' references pipeline '${resourceTemplate.spec.pipelineRef.name}', but the referenced pipeline cannot be found.`, resourceTemplate.spec.pipelineRef, 'name');
      }
    }
  }

  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.conditions) continue;
      for (const condition of task.conditions) {
        if (tekton.conditions[condition.conditionRef]) continue;
        report(`Pipeline '${pipeline.metadata.name}' references Condition '${condition.conditionRef}' but the referenced Condition cannot be found. To fix this, include all the Condition definitions to the lint task for this pipeline.`, condition);
      }
    }
  }

  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.taskRef) continue;
      const name = task.taskRef.name;

      if (!tekton.tasks[name]) {
        report(`Pipeline '${pipeline.metadata.name}' references task '${name}' but the referenced task cannot be found. To fix this, include all the task definitions to the lint task for this pipeline.`, task.taskRef, 'name');
        continue;
      }
    }
  }
};
