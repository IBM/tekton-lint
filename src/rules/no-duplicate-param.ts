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

export default (docs, tekton, report) => {
  for (const t of ['triggerBindings', 'pipelines', 'tasks', 'triggerTemplates']) {
    for (const crd of Object.values<any>(tekton[t])) {
      checkParams(getParams(crd.kind, crd.spec), report);
    }
  }

  for (const template of Object.values<any>(tekton.triggerTemplates)) {
    for (const crd of template.spec.resourcetemplates) {
      if (crd.kind !== 'PipelineRun') continue;
      checkParams(getParams(crd.kind, crd.spec), report);
    }
  }

  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      checkParams(getParams('Task', task), report);
      if (task.taskSpec) {
        checkParams(getParams('Task', task.taskSpec), report);
      }
    }
  }
};
