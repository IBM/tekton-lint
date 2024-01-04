export default (docs, tekton, report) => {
    console.log('tasks');
    for (const task of Object.values<any>(tekton.tasks)) {
        if (!task.spec || !task.spec.workspaces) continue;
        const taskName = task.metadata.name;
        const requiredWorkspaces = task.spec.workspaces.filter((ws) => !ws.optional).map((ws) => ws.name);

        for (const pipeline of Object.values<any>(tekton.pipelines)) {
            const matchingTaskRefs = pipeline.spec.tasks.filter(
                (task) => task.taskRef && task.taskRef.name === taskName,
            );

            for (const taskRef of matchingTaskRefs) {
                const usedWorkspaces = taskRef.workspaces || [];

                for (const required of requiredWorkspaces) {
                    if (!usedWorkspaces.find((ws) => ws.name === required)) {
                        report(
                            `Pipeline '${pipeline.metadata.name}' references Task '${taskName}' (as '${taskRef.name}'), but provides no workspace for '${required}' (it's a required workspace in '${taskName}')`,
                            taskRef.workspaces || taskRef,
                        );
                    }
                }
            }
        }
    }
    console.log('pipelines');
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        const pipelineWorkspaces = pipeline.spec.workspaces || [];
        for (const task of pipeline.spec.tasks) {
            if (!task.workspaces) continue;
            for (const workspace of task.workspaces) {                
                let matchingWorkspace = false;
                if (workspace.workspace) {
                    matchingWorkspace = pipelineWorkspaces.find(({ name }) => name === workspace.workspace);
                } else {
                    // no workspace defined - which is strictly optional, so check the name field instead
                    matchingWorkspace = pipelineWorkspaces.find(({ name }) => name === workspace.name);
                }
                if (!matchingWorkspace) {
                    report(
                        `Pipeline '${pipeline.metadata.name}' provides workspace '${workspace.workspace}' for '${workspace.name}' for Task '${task.name}', but '${workspace.workspace}' doesn't exists in '${pipeline.metadata.name}'`,
                        workspace,
                        'workspace',
                    );
                }
            }
        }
    }
    console.log('trigger templates');

    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        if (!pipeline.spec || !pipeline.spec.workspaces) continue;
        const required = pipeline.spec.workspaces.map((ws) => ws.name);

        for (const template of Object.values<any>(tekton.triggerTemplates)) {
            const pipelineRuns = template.spec.resourcetemplates.filter(
                (item) => item.spec && item.spec.pipelineRef && item.spec.pipelineRef.name === pipeline.metadata.name,
            );

            for (const pipelineRun of pipelineRuns) {
                const provided = pipelineRun.spec.workspaces || [];

                for (const workspace of required) {
                    if (!provided.find((ws) => ws.name === workspace)) {
                        report(
                            `TriggerTemplate '${template.metadata.name}' references Pipeline '${pipeline.metadata.name}', but provides no workspace for '${workspace}' (it's a required workspace in '${pipeline.metadata.name}')`,
                            pipelineRun.spec.workspaces || pipelineRun.spec,
                        );
                    }
                }
            }
        }
    }
    console.log('done');
};
