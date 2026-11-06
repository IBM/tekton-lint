const isObject = (value: unknown): value is Record<string, any> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Makes a list field safe for rules to iterate: a non-list value is removed, and entries that are not
 * objects (for example a bare `- ` in YAML) are dropped in place. The array identity is kept, so the
 * reporter can still map the remaining nodes back to their source locations.
 * A missing or null field is left alone, because rules already handle that case.
 */
function cleanObjectList(owner: any, key: string) {
    if (!isObject(owner) || owner[key] === undefined || owner[key] === null) return;
    const list = owner[key];
    if (!Array.isArray(list)) {
        delete owner[key];
        return;
    }
    for (let i = list.length - 1; i >= 0; i--) {
        if (!isObject(list[i])) list.splice(i, 1);
    }
}

/** Removes a field that must be a list but is not. */
function requireList(owner: any, key: string) {
    if (isObject(owner) && owner[key] !== undefined && owner[key] !== null && !Array.isArray(owner[key])) {
        delete owner[key];
    }
}

function cleanContainer(container: any) {
    if (!isObject(container)) return;
    cleanObjectList(container, 'env');
    cleanObjectList(container, 'volumeMounts');
}

function cleanTaskSpec(spec: any) {
    if (!isObject(spec)) return;
    for (const key of ['params', 'steps', 'sidecars', 'volumes', 'workspaces', 'results']) {
        cleanObjectList(spec, key);
    }
    cleanContainer(spec.stepTemplate);
    for (const container of [...(spec.steps || []), ...(spec.sidecars || [])]) {
        cleanContainer(container);
    }
}

function cleanPipelineSpec(spec: any) {
    if (!isObject(spec)) return;
    for (const key of ['params', 'workspaces', 'results', 'tasks', 'finally']) {
        cleanObjectList(spec, key);
    }
    for (const list of [spec.tasks, spec.finally]) {
        if (!Array.isArray(list)) continue;
        for (const task of list) {
            cleanObjectList(task, 'params');
            cleanObjectList(task, 'workspaces');
            cleanObjectList(task, 'conditions');
            requireList(task, 'runAfter');
            cleanTaskSpec(task.taskSpec);
        }
    }
}

function cleanDoc(doc: any, depth = 0) {
    if (!isObject(doc) || depth > 3) return;
    const spec = doc.spec;
    if (!isObject(spec)) return;
    switch (doc.kind) {
        case 'Task':
        case 'ClusterTask':
            cleanTaskSpec(spec);
            break;
        case 'TaskRun':
            cleanObjectList(spec, 'params');
            cleanTaskSpec(spec.taskSpec);
            break;
        case 'Pipeline':
            cleanPipelineSpec(spec);
            break;
        case 'PipelineRun':
            cleanObjectList(spec, 'params');
            cleanPipelineSpec(spec.pipelineSpec);
            break;
        case 'TriggerTemplate':
            cleanObjectList(spec, 'params');
            cleanObjectList(spec, 'resourcetemplates');
            for (const template of spec.resourcetemplates || []) {
                cleanDoc(template, depth + 1);
            }
            break;
        case 'EventListener':
            cleanObjectList(spec, 'triggers');
            break;
        case 'Condition':
            cleanObjectList(spec, 'params');
            break;
    }
}

/**
 * Normalises schema-incomplete documents in place so rules can assume list fields are lists of objects.
 * Invalid shapes are not reported here; they are the Kubernetes API server's job.
 */
export function normalizeDocs(docs: any[]) {
    for (const doc of docs) {
        cleanDoc(doc);
    }
}
