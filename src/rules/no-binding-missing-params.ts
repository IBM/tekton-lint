export default (docs, tekton, report) => {
  for (const triggerBinding of Object.values<any>(tekton.triggerBindings)) {
    if (!triggerBinding.spec || !triggerBinding.spec.params) continue;
    for (const param of triggerBinding.spec.params) {
      if (param.value === undefined) report(`TriggerBinding '${triggerBinding.metadata.name}' defines parameter '${param.name}' with missing value`, param);
    }
  }
};
