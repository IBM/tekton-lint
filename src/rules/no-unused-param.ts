import { walk } from '../walk';

const unused = (params, prefix) => (node) => {
  const r1 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`, 'g');
  const r2 = new RegExp(`\\$\\(${prefix}.(.*?)(\\[\\*\\])?\\)`);
  const m = node.toString().match(r1);

  if (!m) return;

  for (const item of m) {
    const m2 = item.match(r2);
    const param = m2[1];
    if (params[param] != null) {
      params[param]++;
    }
  }
};

function getParams(kind, spec) {
  if (kind === 'Task' && spec.inputs && spec.inputs.params) return spec.inputs.params;
  if (spec.params) return spec.params;
  return [];
}

export default (docs, tekton, report) => {
  for (const task of Object.values<any>(tekton.tasks)) {
    const params = getParams(task.kind, task.spec);
    const occurences = Object.fromEntries(params.map(param => [param.name, 0]));
    for (const prefix of ['inputs.params', 'params']) {
      for (const prop of ['steps', 'volumes', 'stepTemplate', 'sidecars', 'workspaces']) {
        walk(task.spec[prop], ['spec', prop], unused(occurences, prefix));
      }
    }
    for (const [param, n] of Object.entries(occurences)) {
      if (n) continue;
      report(`Task '${task.metadata.name}' defines parameter '${param}', but it's not used anywhere in the spec`, params.find(p => p.name === param));
    }
  }

  for (const condition of Object.values<any>(tekton.conditions)) {
    const params = getParams(condition.kind, condition.spec);
    const occurences = Object.fromEntries(params.map(param => [param.name, 0]));
    walk(condition.spec.check, ['spec', 'check'], unused(occurences, 'params'));
    for (const [param, n] of Object.entries(occurences)) {
      if (n) continue;
      report(`Condition '${condition.metadata.name}' defines parameter '${param}', but it's not used anywhere in the spec`, params.find(p => p.name === param));
    }
  }

  for (const template of Object.values<any>(tekton.triggerTemplates)) {
    const params = getParams(template.kind, template.spec);
    const occurences = Object.fromEntries(params.map(param => [param.name, 0]));
    walk(template.spec, ['spec'], unused(occurences, 'params'));
    for (const [param, n] of Object.entries(occurences)) {
      if (n) continue;
      report(`TriggerTemplate '${template.metadata.name}' defines parameter '${param}', but it's not used anywhere in the spec`, params.find(p => p.name === param));
    }
  }

  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    const params = getParams(pipeline.kind, pipeline.spec);
    const occurences = Object.fromEntries(params.map(param => [param.name, 0]));
    walk(pipeline.spec.tasks, ['spec', 'tasks'], unused(occurences, 'params'));
    for (const [param, n] of Object.entries(occurences)) {
      if (n) continue;
      report(`Pipeline '${pipeline.metadata.name}' defines parameter '${param}', but it's not used anywhere in the spec`, params.find(p => p.name === param));
    }
  }
};
