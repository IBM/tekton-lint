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
    // Rules read `mount.name` as a string, so drop mounts without a usable name
    if (Array.isArray(container.volumeMounts)) {
        for (let i = container.volumeMounts.length - 1; i >= 0; i--) {
            if (typeof container.volumeMounts[i].name !== 'string') container.volumeMounts.splice(i, 1);
        }
    }
}

function cleanMatrix(matrix: any) {
    if (!isObject(matrix)) return;
    cleanObjectList(matrix, 'params');
    cleanObjectList(matrix, 'include');
    if (Array.isArray(matrix.include)) {
        for (const item of matrix.include) cleanObjectList(item, 'params');
    }
}

function cleanTaskSpec(spec: any) {
    if (!isObject(spec)) return;
    for (const key of ['params', 'steps', 'sidecars', 'volumes', 'workspaces', 'results']) {
        cleanObjectList(spec, key);
    }
    // Legacy (v1alpha1/v1beta1) location of Task parameters
    cleanObjectList(spec.inputs, 'params');
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
            // Legacy (v1alpha1) pipeline resources
            cleanObjectList(task.resources, 'inputs');
            cleanMatrix(task.matrix);
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
            cleanObjectList(spec, 'workspaces');
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
        case 'TriggerBinding':
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
