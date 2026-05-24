import { walk, pathToString } from '../walk.js';

const createVisitor = (resource, params, prefix, report) => (node, path, parent) => {
    if (path.includes('taskSpec')) return;
    const r1 = new RegExp(`\\$\\(${prefix}.(.*?)\\)`, 'g');
    const r2 = new RegExp(`\\$\\(${prefix}.(.*?)(\\[\\*\\])?\\)`);
    const m = node.toString().match(r1);
    if (!m) return;
    for (const item of m) {
        const m2 = item.match(r2);
        const param = m2[1];
        if (!containsParam(params,param)) {
            report(
                `Undefined param '${param}' at ${pathToString(path)} in '${resource}'`,
                parent,
                path[path.length - 1],
            );
        }
    }
};

function containsParam(allParams, param) {
    if (allParams.some((p) => p.name === param)) return true;
    const paramParts = param.split('.');
    if (paramParts.length > 1) {
        const paramName = paramParts[0];
        const propName = paramParts[1];
        const paramObj = allParams.find((p) => p.name === paramName);
        return (paramObj && paramObj.type === 'object' && paramObj.properties && paramObj.properties[propName])
    }

    return false;
}

function getParams(crd) {
    if (!crd.spec || !crd.spec.params) return [];
    return crd.spec.params
}

function getTaskParams(crd) {
    if (!crd.spec) return [];
    if (crd.spec.params) return crd.spec.params
    if (!crd.spec.inputs) return [];
    if (crd.spec.inputs.params) return crd.spec.inputs.params
    return [];
}

export default (docs, tekton, report) => {
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        const params = getParams(pipeline);
        walk(pipeline.spec.tasks, ['spec', 'tasks'], createVisitor(pipeline.metadata.name, params, 'params', report));
        walk(
            pipeline.spec.finally,
            ['spec', 'finally'],
            createVisitor(pipeline.metadata.name, params, 'params', report),
        );
    }

    for (const task of Object.values<any>(tekton.tasks)) {
        if (!task.spec) continue;
        const params = getTaskParams(task);
        for (const prefix of ['inputs.params', 'params']) {
            for (const prop of ['steps', 'volumes', 'stepTemplate', 'sidecars']) {
                walk(task.spec[prop], ['spec', prop], createVisitor(task.metadata.name, params, prefix, report));
            }
        }
    }

    for (const template of Object.values<any>(tekton.triggerTemplates)) {
        const params = getParams(template);
        walk(
            template.spec.resourcetemplates,
            ['spec', 'resourcetemplates'],
            createVisitor(template.metadata.name, params, 'params', report),
        );
        walk(
            template.spec.resourcetemplates,
            ['spec', 'resourcetemplates'],
            createVisitor(template.metadata.name, params, 'tt.params', report),
        );
    }
};
