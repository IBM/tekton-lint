function getParams(kind, spec) {
    if (!spec) return [];
    if (kind === 'Task' && spec.inputs && spec.inputs.params) return spec.inputs.params;
    if (spec.params) return spec.params;
    return [];
}

function checkParams(params, report) {
    if (!params) return;
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

            if (crd.spec.pipelineSpec) {
                if (crd.spec.pipelineSpec.params) {
                    checkParams(crd.spec.pipelineSpec.params, report);
                }
                if (crd.spec.pipelineSpec.tasks) {
                    for (const t of crd.spec.pipelineSpec.tasks) {
                        checkParams(t.params, report);
                        if (t.taskSpec && t.taskSpec.params) {
                            checkParams(t.taskSpec.params, report);
                        }
                    }
                }
            }
        }
    }

    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        // include any finally tasks if they are present
        const tasks = [...pipeline.spec.tasks, ...(pipeline.spec.finally ? pipeline.spec.finally : [])];
        for (const task of tasks) {
            checkParams(getParams('Task', task), report);
            if (task.taskSpec) {
                checkParams(getParams('Task', task.taskSpec), report);
            }
        }
    }
};
