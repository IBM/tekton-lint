import { RuleReportFn } from 'src/interfaces/common.js';

function checkTasks(tasks, parentWorkspaces, parentName, report) {
    for (const task of tasks) {
        if (!task.workspaces) continue;
        for (const workspace of task.workspaces) {
            let matchingWorkspace = false;
            if (workspace.workspace) {
                matchingWorkspace = parentWorkspaces.find(({ name }) => name === workspace.workspace);
            } else {
                // no workspace defined - which is strictly optional, so check the name field instead
                matchingWorkspace = parentWorkspaces.find(({ name }) => name === workspace.name);
            }
            if (!matchingWorkspace) {
                report(
                    `Pipeline '${parentName}' provides workspace '${workspace.workspace}' for '${workspace.name}' for Task '${task.name}', but '${workspace.workspace}' doesn't exists in '${parentName}'`,
                    workspace,
                    'workspace',
                );
            }
        }
    }
}

export default (docs, tekton, report: RuleReportFn) => {
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

    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        const pipelineWorkspaces = pipeline.spec.workspaces || [];
        // include any finally tasks if they are present
        const tasks = [...pipeline.spec.tasks, ...(pipeline.spec.finally ? pipeline.spec.finally : [])];
        checkTasks(tasks, pipelineWorkspaces, pipeline.metadata.name, report);
    }

    for (const pipeline of Object.values<any>(tekton.pipelineRuns)) {
        if (!pipeline || !pipeline.spec || !pipeline.spec.pipelineSpec) continue;
        const pipelineWorkspaces = pipeline.spec.pipelineSpec.workspaces || [];
        // include any finally tasks if they are present
        const tasks = [
            ...(pipeline.spec.pipelineSpec.tasks || []),
            ...(pipeline.spec.pipelineSpec.finally ? pipeline.spec.pipelineSpec.finally : []),
        ];
        checkTasks(tasks, pipelineWorkspaces, pipeline.metadata.name, report);

        // check the spec workspaces and the pieline spec
        const runWorkspaces = pipeline.spec.workspaces;
        const specWorkspaces = pipeline.spec.pipelineSpec.workspaces;
        if (!specWorkspaces) continue;

        specWorkspaces
            .filter((s) => !s)
            .forEach((sws) => {
                if (!runWorkspaces.find((ws) => (sws as any).name == ws.name)) {
                    console.log(`${sws.name} not found`);
                    report(
                        `Pipeline run '${pipeline.metadata.name}' has a pipelineSpec with workspace '${sws.name}' that is not defined in the pipeline`,
                        sws,
                    );
                }
            });
    }

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
};
