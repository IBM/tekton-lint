module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    if (!task.spec.workspaces) continue;
    const taskName = task.metadata.name;
    const requiredWorkspaces = task.spec.workspaces.map(ws => ws.name);

    for (const pipeline of Object.values(tekton.pipelines)) {
      const matchingTaskRefs = pipeline.spec.tasks.filter(task => task.taskRef && task.taskRef.name === taskName);

      for (const taskRef of matchingTaskRefs) {
        const usedWorkspaces = taskRef.workspaces || [];

        for (const required of requiredWorkspaces) {
          if (!usedWorkspaces.find(ws => ws.name === required)) {
            report(`Pipeline '${pipeline.metadata.name}' references Task '${taskName}' (as '${taskRef.name}'), but provides no workspace for '${required}' (it's a required workspace in '${taskName}')`, taskRef.workspaces || taskRef);
          }
        }
      }
    }
  }

  for (const pipeline of Object.values(tekton.pipelines)) {
    const pipelineWorkspaces = pipeline.spec.workspaces || [];
    for (const task of pipeline.spec.tasks) {
      if (!task.workspaces) continue;
      for (const workspace of task.workspaces) {
        const matchingWorkspace = pipelineWorkspaces.find(({ name }) => name === workspace.workspace);
        if (!matchingWorkspace) {
          report(`Pipeline '${pipeline.metadata.name}' provides workspace '${workspace.workspace}' for '${workspace.name}' for Task '${task.name}', but '${workspace.workspace}' doesn't exists in '${pipeline.metadata.name}'`, workspace, 'workspace');
        }
      }
    }
  }
};
