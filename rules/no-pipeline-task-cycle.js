const { alg, Graph } = require('graphlib');

function readParamReference({ value }) {
  const taskResultReferenceRegexp = /\$\(tasks\.[a-z|-]*\.results\.[a-z|-]*\)/;
  if (!value) return;
  if (!value.match(taskResultReferenceRegexp)) return;
  const referencedTaskname = value.split('$(tasks.')[1].split('.')[0];

  return {
    ref: referencedTaskname,
  };
};

function paramsReferences({ params }) {
  if (params === undefined || params === null) return [];

  return params.map(param => ({
    ...readParamReference(param),
    type: 'paramRef',
  }))
    .filter(({ ref }) => ref !== undefined);
};

function runAfterReferences({ runAfter }) {
  if (runAfter === undefined || runAfter === null) return [];

  return runAfter.map(after => ({
    ref: after,
    type: 'runAfterRef',
  }));
};


function resourceInputReferences(task) {
  const { resources } = task;
  if (resources === undefined || resources === null) return [];
  const { inputs } = resources;
  if (inputs === undefined || inputs === null) return [];
  const inputsFromTasks = inputs.filter(input => input.from !== undefined);
  return inputsFromTasks.map(input => ({
    ref: input.from,
    type: 'resourceRef',
  }));
};

function buildTaskGraph(pipeline, referenceCreators) {
  const pipelineGraph = new Graph({ directed: true, multigraph: true });
  pipelineGraph.setGraph(pipeline.metadata.name);
  if (!pipeline.spec.tasks || pipeline.spec.tasks === []) {
    return pipelineGraph;
  }
  for (const task of pipeline.spec.tasks) {
    pipelineGraph.setNode(task.name, task);
    for (const referenceCreator of referenceCreators) {
      for (const { ref, type } of referenceCreator(task)) {
        if (!pipelineGraph.node(ref)) {
          pipelineGraph.setNode(task, undefined);
        }
        pipelineGraph.setEdge(ref, task.name, type);
      }
    }
  }
  return pipelineGraph;
}

function errorCyclesInPipeline(pipeline, referenceCreators, report) {
  const pipelineTaskGraph = buildTaskGraph(pipeline, referenceCreators);
  for (const cycle of alg.findCycles(pipelineTaskGraph)) {
    for (const taskNameInCycle of cycle) {
      const taskInCycle = Object.values(pipeline.spec.tasks).find(task => task.name === taskNameInCycle);
      report(`Cycle found in tasks (dependency graph): ${[...cycle, cycle[0]].join(' -> ')}`, taskInCycle, 'name');
    }
  }
}

module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    errorCyclesInPipeline(pipeline, [runAfterReferences, paramsReferences, resourceInputReferences], report);
  }
};
