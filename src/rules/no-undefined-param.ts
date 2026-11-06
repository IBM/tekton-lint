import { walk, pathToString } from '../walk.js';
import { extractVariableRefs, resolveParamName } from '../utils.js';

const createVisitor = (resource, params, prefix, report) => (node, path, parent) => {
    if (path.includes('taskSpec')) return;
    const known = new Set<string>(params);
    for (const segments of extractVariableRefs(node.toString(), `${prefix}`)) {
        if (!resolveParamName(segments, known)) {
            const param = segments[0];
            report(
                `Undefined param '${param}' at ${pathToString(path)} in '${resource}'`,
                parent,
                path[path.length - 1],
            );
        }
    }
};

function getParams(crd) {
    if (!crd.spec || !crd.spec.params) return [];
    return crd.spec.params.map((param) => param.name);
}

function getTaskParams(crd) {
    if (!crd.spec) return [];
    if (crd.spec.params) return crd.spec.params.map((param) => param.name);
    if (!crd.spec.inputs) return [];
    if (crd.spec.inputs.params) return crd.spec.inputs.params.map((param) => param.name);
    return [];
}

export default (docs, tekton, report) => {
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        const params = getParams(pipeline);
        if (pipeline.spec?.tasks) {
            walk(
                pipeline.spec.tasks,
                ['spec', 'tasks'],
                createVisitor(pipeline.metadata.name, params, 'params', report),
            );
        }
        if (pipeline.spec?.finally) {
            walk(
                pipeline.spec.finally,
                ['spec', 'finally'],
                createVisitor(pipeline.metadata.name, params, 'params', report),
            );
        }
    }

    for (const task of Object.values<any>(tekton.tasks)) {
        if (!task.spec) continue;
        const params = getTaskParams(task);
        for (const prefix of ['inputs.params', 'params']) {
            for (const prop of ['steps', 'volumes', 'stepTemplate', 'sidecars']) {
                if (task.spec[prop]) {
                    walk(task.spec[prop], ['spec', prop], createVisitor(task.metadata.name, params, prefix, report));
                }
            }
        }
    }

    for (const template of Object.values<any>(tekton.triggerTemplates)) {
        const params = getParams(template);
        if (template.spec?.resourcetemplates) {
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
    }
};
