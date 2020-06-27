module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    if (!pipeline.spec.workspaces) continue;
    const required = pipeline.spec.workspaces.map(ws => ws.name);

    for (const template of Object.values(tekton.triggerTemplates)) {
      const pipelineRuns = template.spec.resourcetemplates.filter(item => item.spec && item.spec.pipelineRef && item.spec.pipelineRef.name === pipeline.metadata.name);

      for (const pipelineRun of pipelineRuns) {
        const provided = pipelineRun.spec.workspaces || [];

        for (const workspace of required) {
          if (!provided.find(ws => ws.name === workspace)) {
            report(`TriggerTemplate '${template.metadata.name}' references Pipeline '${pipeline.metadata.name}', but provides no workspace for '${workspace}' (it's a required workspace in '${pipeline.metadata.name}')`, pipelineRun.spec.workspaces || pipelineRun.spec);
          }
        }
      }
    }
  }
};
