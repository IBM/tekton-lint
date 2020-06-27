module.exports = (docs, tekton, report) => {
  for (const listener of Object.values(tekton.listeners)) {
    for (const trigger of listener.spec.triggers) {
      if (!trigger.binding) continue;
      const name = trigger.binding.name;
      if (!tekton.triggerBindings[name]) {
        report(`EventListener '${listener.metadata.name}' defines trigger binding '${name}', but the trigger binding is missing.`, trigger.binding, 'name');
      }
    }
  }
};
