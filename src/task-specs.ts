/**
 * Yields every embedded or top-level task spec found in a Tekton document:
 * Task/ClusterTask `spec`, TaskRun `spec.taskSpec`, inline `taskSpec` in Pipeline
 * and PipelineRun (`tasks` and `finally`), and anything nested in TriggerTemplate resourcetemplates.
 */
export function* collectTaskSpecs(doc: any, depth = 0): Generator<any> {
    if (!doc || typeof doc !== 'object' || depth > 3) return;
    const spec = doc.spec;
    if (!spec || typeof spec !== 'object') return;

    switch (doc.kind) {
        case 'Task':
        case 'ClusterTask':
            yield spec;
            break;
        case 'TaskRun':
            if (spec.taskSpec) yield spec.taskSpec;
            break;
        case 'Pipeline':
            yield* pipelineTaskSpecs(spec);
            break;
        case 'PipelineRun':
            if (spec.pipelineSpec) yield* pipelineTaskSpecs(spec.pipelineSpec);
            break;
        case 'TriggerTemplate':
            if (Array.isArray(spec.resourcetemplates)) {
                for (const template of spec.resourcetemplates) {
                    yield* collectTaskSpecs(template, depth + 1);
                }
            }
            break;
    }
}

function* pipelineTaskSpecs(pipelineSpec: any): Generator<any> {
    for (const list of [pipelineSpec?.tasks, pipelineSpec?.finally]) {
        if (!Array.isArray(list)) continue;
        for (const task of list) {
            if (task?.taskSpec && typeof task.taskSpec === 'object') yield task.taskSpec;
        }
    }
}

/**
 * Yields every pod template of a TaskRun or PipelineRun (including ones nested in a TriggerTemplate),
 * with a label for the owning resource: `spec.podTemplate`, `spec.taskRunTemplate.podTemplate` and
 * `spec.taskRunSpecs[].podTemplate`.
 */
export function* collectPodTemplates(doc: any, depth = 0): Generator<{ owner: string; podTemplate: any }> {
    if (!doc || typeof doc !== 'object' || depth > 3) return;
    const spec = doc.spec;
    if (!spec || typeof spec !== 'object') return;
    const owner = `${doc.kind} '${doc.metadata?.name ?? doc.metadata?.generateName}'`;

    switch (doc.kind) {
        case 'TaskRun':
        case 'PipelineRun': {
            const candidates = [spec.podTemplate, spec.taskRunTemplate?.podTemplate];
            if (Array.isArray(spec.taskRunSpecs)) {
                for (const taskRunSpec of spec.taskRunSpecs) candidates.push(taskRunSpec?.podTemplate);
            }
            for (const podTemplate of candidates) {
                if (podTemplate && typeof podTemplate === 'object') yield { owner, podTemplate };
            }
            break;
        }
        case 'TriggerTemplate':
            if (Array.isArray(spec.resourcetemplates)) {
                for (const template of spec.resourcetemplates) {
                    yield* collectPodTemplates(template, depth + 1);
                }
            }
            break;
    }
}

/**
 * Yields every container-like entry in a task spec that carries an `image`:
 * `stepTemplate`, `steps` and `sidecars`.
 */
export function* collectContainers(taskSpec: any): Generator<any> {
    if (!taskSpec || typeof taskSpec !== 'object') return;
    if (taskSpec.stepTemplate && typeof taskSpec.stepTemplate === 'object') yield taskSpec.stepTemplate;
    for (const list of [taskSpec.steps, taskSpec.sidecars]) {
        if (!Array.isArray(list)) continue;
        for (const container of list) {
            if (container && typeof container === 'object') yield container;
        }
    }
}
