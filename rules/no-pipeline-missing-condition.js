module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.conditions) continue;
      for (const condition of task.conditions) {
        const exists = Object.values(tekton.conditions).find(cond => cond.metadata.name === condition.conditionRef);
        if (!exists) {
          report(`Pipeline '${pipeline.metadata.name}' references Condition '${condition.conditionRef}' but the referenced Condition cannot be found. To fix this, include all the Condition definitions to the lint task for this pipeline.`, condition);
        }
      }
    }
  }
};
