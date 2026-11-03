export default (docs, tekton, report) => {
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        const pipelineTasks = pipeline.spec?.tasks || [];
        for (const task of pipelineTasks) {
            if (!task.runAfter) continue;

            for (const dependency of task.runAfter) {
                const exists = pipelineTasks.some((t: any) => t.name === dependency);
                const details = task.taskSpec
                    ? 'defined in-line'
                    : task.taskRef?.name
                      ? `referenced as '${task.taskRef.name}'`
                      : 'referenced via resolver';

                if (!exists) {
                    report(
                        `Pipeline '${pipeline.metadata.name}' uses task '${task.name}' (${details}), and it depends on '${dependency}', which doesn't exists (declared in runAfter)`,
                        task.runAfter,
                        task.runAfter.indexOf(dependency),
                    );
                }
            }
        }
    }

    // Run on the PipelineSpecs as well
    for (const pipelineSpec of Object.values<any>(tekton.pipelineRuns)) {
        if (!pipelineSpec.spec || !pipelineSpec.spec.pipelineSpec) continue;
        const taskRoot = pipelineSpec.spec.pipelineSpec.tasks;
        if (taskRoot) {
            for (const task of taskRoot) {
                if (!task.runAfter) continue;

                for (const dependency of task.runAfter) {
                    const exists = taskRoot.some((t: any) => t.name === dependency);
                    const details = task.taskSpec
                        ? 'defined in-line'
                        : task.taskRef?.name
                          ? `referenced as '${task.taskRef.name}'`
                          : 'referenced via resolver';

                    if (!exists) {
                        report(
                            `Pipeline '${pipelineSpec.metadata.name}' uses task '${task.name}' (${details}), and it depends on '${dependency}', which doesn't exists (declared in runAfter)`,
                            task.runAfter,
                            task.runAfter.indexOf(dependency),
                        );
                    }
                }
            }
        }
    }
};
