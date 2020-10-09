import { walk, pathToString } from '../walk';

const createVisitor = (resource, params, prefix, report) => (node, path, parent) => {
  if (path.includes('taskSpec')) return;
  const r1 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`, 'g');
  const r2 = new RegExp(`\\$\\(${prefix}.(.*?)(\\[\\*\\])?\\)`);
  const m = node.toString().match(r1);
  if (!m) return;
  for (const item of m) {
    const m2 = item.match(r2);
    const param = m2[1];
    if (!params.includes(param)) {
      report(`Undefined param '${param}' at ${pathToString(path)} in '${resource}'`, parent, path[path.length - 1]);
    }
  }
};

function getParams(crd) {
  if (!crd.spec || !crd.spec.params) return [];
  return crd.spec.params.map(param => param.name);
}

function getTaskParams(crd) {
  if (!crd.spec) return [];
  if (crd.spec.params) return crd.spec.params.map(param => param.name);
  if (!crd.spec.inputs) return [];
  if (crd.spec.inputs.params) return crd.spec.inputs.params.map(param => param.name);
  return [];
}

export default (docs, tekton, report) => {
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    const params = getParams(pipeline);
    walk(pipeline.spec.tasks, ['spec', 'tasks'], createVisitor(pipeline.metadata.name, params, 'params', report));
  }

  for (const task of Object.values<any>(tekton.tasks)) {
    const params = getTaskParams(task);
    for (const prefix of ['inputs.params', 'params']) {
      for (const prop of ['steps', 'volumes', 'stepTemplate', 'sidecars']) {
        walk(task.spec[prop], ['spec', prop], createVisitor(task.metadata.name, params, prefix, report));
      }
    }
  }

  for (const template of Object.values<any>(tekton.triggerTemplates)) {
    const params = getParams(template);
    walk(template.spec.resourcetemplates, ['spec', 'resourcetemplates'], createVisitor(template.metadata.name, params, 'params', report));
  }
};
