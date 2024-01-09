const checkSteps = (steps, report) => {
    if (!Array.isArray(steps)) return;
    for (const step of steps) {
        if (!step.script) continue;
        if (!/^#!(.*)/.test(step.script)) {
            report(`Step script '${step.name}' should start with a hashbang line.`, step, 'script');
        }
    }
};

export default (docs, tekton, report) => {
    for (const task of Object.values<any>(tekton.tasks)) {
        if (!task.spec) continue;
        checkSteps(task.spec.steps, report);
    }

    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        // include any finally tasks if they are present
        const tasks = [...pipeline.spec.tasks, ...(pipeline.spec.finally ? pipeline.spec.finally : [])];
        for (const task of tasks) {
            if (!task.taskSpec) continue;
            checkSteps(task.taskSpec.steps, report);
        }
    }

    for (const template of Object.values<any>(tekton.triggerTemplates)) {
        for (const resourceTemplate of template.spec.resourcetemplates) {
            if (resourceTemplate.kind !== 'PipelineRun') continue;
            const pipelineSpec = resourceTemplate.spec.pipelineSpec;
            if (!pipelineSpec) continue;
            if (!Array.isArray(pipelineSpec.tasks)) continue;
            for (const task of pipelineSpec.tasks) {
                if (!task.taskSpec) continue;
                checkSteps(task.taskSpec.steps, report);
            }
        }
    }
};
