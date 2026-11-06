// Features that are deprecated or removed in tekton.dev/v1.
// `conditions:` on pipeline tasks is covered by the prefer-when-expression rule.

const hasKeys = (value) => value && typeof value === 'object' && Object.keys(value).length > 0;

function checkTaskSpec(spec, owner, report) {
    if (!spec || typeof spec !== 'object') return;
    if (hasKeys(spec.resources)) {
        report(
            `${owner} uses 'resources', but PipelineResources are deprecated and removed in tekton.dev/v1. Use workspaces, params or results instead`,
            spec,
            'resources',
        );
    }
    for (const direction of ['inputs', 'outputs']) {
        if (hasKeys(spec[direction]?.resources)) {
            report(
                `${owner} uses '${direction}.resources', but PipelineResources are deprecated and removed in tekton.dev/v1. Use workspaces, params or results instead`,
                spec[direction],
                'resources',
            );
        }
    }
}

function checkPipelineSpec(spec, owner, report) {
    checkTaskSpec(spec, owner, report);
    if (!spec || typeof spec !== 'object') return;
    for (const list of [spec.tasks, spec.finally]) {
        if (!Array.isArray(list)) continue;
        for (const task of list) {
            if (!task || typeof task !== 'object') continue;
            if (task.taskRef?.kind === 'ClusterTask') {
                report(
                    `${owner} references ClusterTask '${task.taskRef.name}', but ClusterTask is deprecated and removed. Use a Task with a cluster, hub or bundle resolver`,
                    task.taskRef,
                    'kind',
                );
            }
            checkTaskSpec(task, `${owner} task '${task.name}'`, report);
            checkTaskSpec(task.taskSpec, `${owner} task '${task.name}'`, report);
        }
    }
}

function checkDoc(doc, report, depth = 0) {
    if (!doc || typeof doc !== 'object' || depth > 3) return;
    const name = doc.metadata?.name;
    switch (doc.kind) {
        case 'ClusterTask':
            report(
                `ClusterTask '${name}' is deprecated and removed in recent Tekton releases. Use a Task with a cluster, hub or bundle resolver`,
                doc,
                'kind',
            );
            checkTaskSpec(doc.spec, `ClusterTask '${name}'`, report);
            break;
        case 'Condition':
            report(`Condition '${name}' is deprecated and removed. Use 'when' expressions instead`, doc, 'kind');
            break;
        case 'PipelineResource':
            report(
                `PipelineResource '${name}' is deprecated and removed in tekton.dev/v1. Use workspaces, params or results instead`,
                doc,
                'kind',
            );
            break;
        case 'Task':
            checkTaskSpec(doc.spec, `Task '${name}'`, report);
            break;
        case 'Pipeline':
            checkPipelineSpec(doc.spec, `Pipeline '${name}'`, report);
            break;
        case 'PipelineRun':
            checkPipelineSpec(doc.spec?.pipelineSpec, `PipelineRun '${name}'`, report);
            if (hasKeys(doc.spec?.resources)) {
                report(
                    `PipelineRun '${name}' uses 'resources', but PipelineResources are deprecated and removed in tekton.dev/v1`,
                    doc.spec,
                    'resources',
                );
            }
            break;
        case 'TriggerTemplate':
            for (const template of Array.isArray(doc.spec?.resourcetemplates) ? doc.spec.resourcetemplates : []) {
                checkDoc(template, report, depth + 1);
            }
            break;
    }
}

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        checkDoc(doc, report);
    }
};
