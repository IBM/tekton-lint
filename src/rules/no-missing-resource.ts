import { parsePacTaskAnnotations } from '../utils.js';

export default (docs, tekton, report) => {
    for (const listener of Object.values<any>(tekton.listeners)) {
        for (const trigger of listener.spec.triggers) {
            if (!trigger.binding) continue;
            const name = trigger.binding.name;
            if (!tekton.triggerBindings[name]) {
                report(
                    `EventListener '${listener.metadata.name}' defines trigger binding '${name}', but the trigger binding is missing.`,
                    trigger.binding,
                    'name',
                );
            }
        }
    }

    for (const listener of Object.values<any>(tekton.listeners)) {
        for (const trigger of listener.spec.triggers) {
            if (!trigger.template) continue;
            const triggerReference = trigger.template.name ?? trigger.template.ref;
            const referenceKey = trigger.template.name ? 'name' : 'ref';
            if (!tekton.triggerTemplates[triggerReference]) {
                report(
                    `EventListener '${listener.metadata.name}' defines trigger template '${triggerReference}', but the trigger template is missing.`,
                    trigger.template,
                    referenceKey,
                );
            }
        }
    }

    for (const template of Object.values<any>(tekton.triggerTemplates)) {
        for (const resourceTemplate of template.spec.resourcetemplates) {
            if (resourceTemplate.kind !== 'PipelineRun') continue;
            if (resourceTemplate.spec.pipelineSpec) continue;

            const isRuntimeCreated = /\$\([\S]*\)/g.test(resourceTemplate.spec.pipelineRef.name);
            if (isRuntimeCreated) continue;

            if (!tekton.pipelines[resourceTemplate.spec.pipelineRef.name]) {
                report(
                    `TriggerTemplate '${template.metadata.name}' references pipeline '${resourceTemplate.spec.pipelineRef.name}', but the referenced pipeline cannot be found.`,
                    resourceTemplate.spec.pipelineRef,
                    'name',
                );
            }
        }
    }

    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        // include any finally tasks if they are present
        const tasks = [...pipeline.spec.tasks, ...(pipeline.spec.finally ? pipeline.spec.finally : [])];
        for (const task of tasks) {
            if (!task.conditions) continue;
            for (const condition of task.conditions) {
                if (tekton.conditions[condition.conditionRef]) continue;
                report(
                    `Pipeline '${pipeline.metadata.name}' references Condition '${condition.conditionRef}' but the referenced Condition cannot be found. To fix this, include all the Condition definitions to the lint task for this pipeline.`,
                    condition,
                );
            }
        }
    }

    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        if (!pipeline.spec) continue;

        const requiredVersions = parsePacTaskAnnotations(pipeline);
        // include any finally tasks if they are present
        const tasks = [...pipeline.spec.tasks, ...(pipeline.spec.finally ? pipeline.spec.finally : [])];
        for (const task of tasks) {
            if (!task.taskRef) continue;
            const name = task.taskRef.name;
            const requiredVersion = requiredVersions[name];

            if (requiredVersion) {
                // Version-pinned via PAC annotation — check that specific version exists
                if (!tekton.taskVersions?.[name]?.[requiredVersion]) {
                    report(
                        `Pipeline '${pipeline.metadata.name}' references task '${name}' at version '${requiredVersion}' but that version cannot be found. To fix this, include the v${requiredVersion} task definition in the lint inputs.`,
                        task.taskRef,
                        'name',
                    );
                }
            } else if (!tekton.tasks[name]) {
                if (task.taskRef.kind && task.taskRef.kind === 'ClusterTask') {
                    report(
                        `Pipeline '${pipeline.metadata.name}' references cluster task '${name}' but the referenced task cannot be found locally.`,
                        task.taskRef,
                        'name',
                    );
                } else {
                    report(
                        `Pipeline '${pipeline.metadata.name}' references task '${name}' but the referenced task cannot be found. To fix this, include all the task definitions to the lint task for this pipeline.`,
                        task.taskRef,
                        'name',
                    );
                }
            }
        }
    }

    // ---

    for (const pipeline of Object.values<any>(tekton.pipelineRuns)) {
        if (!pipeline.spec || !pipeline.spec.pipelineSpec) continue;
        const maintasks = pipeline.spec.pipelineSpec.tasks ? pipeline.spec.pipelineSpec.tasks : [];
        const finallytasks = pipeline.spec.pipelineSpec.finally ? pipeline.spec.pipelineSpec.finally : [];

        const requiredVersions = parsePacTaskAnnotations(pipeline);
        const tasks = [...maintasks, ...finallytasks];
        for (const task of tasks) {
            if (!task.taskRef) continue;
            const name = task.taskRef.name;
            const requiredVersion = requiredVersions[name];

            if (requiredVersion) {
                if (!tekton.taskVersions?.[name]?.[requiredVersion]) {
                    report(
                        `Pipeline '${pipeline.metadata.name}' references task '${name}' at version '${requiredVersion}' but that version cannot be found. To fix this, include the v${requiredVersion} task definition in the lint inputs.`,
                        task.taskRef,
                        'name',
                    );
                }
            } else if (!tekton.tasks[name]) {
                if (task.taskRef.kind && task.taskRef.kind === 'ClusterTask') {
                    report(
                        `Pipeline '${pipeline.metadata.name}' references cluster task '${name}' but the referenced task cannot be found locally.`,
                        task.taskRef,
                        'name',
                    );
                } else {
                    report(
                        `Pipeline '${pipeline.metadata.name}' references task '${name}' but the referenced task cannot be found. To fix this, include all the task definitions to the lint task for this pipeline.`,
                        task.taskRef,
                        'name',
                    );
                }
            }
        }
    }
};
