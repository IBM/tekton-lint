function getParams(kind, spec) {
  if (!spec) return [];
  if (kind === 'Task' && spec.inputs && spec.inputs.params) return spec.inputs.params;
  if (spec.params) return spec.params;
  return [];
}

function checkParams(params, report) {
  const names = new Set();
  for (const param of params) {
    if (names.has(param.name)) {
      report(`Duplicate param '${param.name}'`, param, 'name');
    }
    names.add(param.name);
  }
}

module.exports = (docs, tekton, report) => {
  for (const t of ['triggerBindings', 'pipelines', 'tasks', 'triggerTemplates']) {
    for (const crd of Object.values(tekton[t])) {
      checkParams(getParams(crd.kind, crd.spec), report);
    }
  }

  for (const template of Object.values(tekton.triggerTemplates)) {
    for (const crd of template.spec.resourcetemplates) {
      if (crd.kind !== 'PipelineRun') continue;
      checkParams(getParams(crd.kind, crd.spec), report);
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      checkParams(getParams('Task', task), report);
    }
  }
};
