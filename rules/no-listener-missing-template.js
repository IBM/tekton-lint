module.exports = (docs, tekton, report) => {
  for (const listener of Object.values(tekton.listeners)) {
    for (const trigger of listener.spec.triggers) {
      if (!trigger.template) continue;
      const name = trigger.template.name;
      if (!tekton.triggerTemplates[name]) {
        report(`EventListener '${listener.metadata.name}' defines trigger template '${name}', but the trigger template is missing.`, trigger.template, 'name');
      }
    }
  }
};
