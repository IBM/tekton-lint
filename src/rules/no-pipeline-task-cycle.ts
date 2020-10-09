import { alg, Graph } from 'graphlib';

const RESULT_PATTERN = '\\$\\(tasks\\.([^.]+)\\.results\\.[^.]*\\)';
const RESULT_REGEX_G = new RegExp(RESULT_PATTERN, 'g');
const RESULT_REGEX = new RegExp(RESULT_PATTERN);

function getReferences(str) {
  const matches = str.match(RESULT_REGEX_G);
  if (!matches) return [];
  return matches.map(substr => substr.match(RESULT_REGEX)[1]);
}

function getResultReferences(param) {
  if (Array.isArray(param.value)) {
    return param.value.flatMap(getReferences);
  } else if (param.value) {
    return getReferences(param.value);
  }
  return [];
}

function paramsReferences(task) {
  if (!task.params) return [];
  return task.params
    .flatMap(getResultReferences)
    .filter(Boolean)
    .map(ref => ({
      ref,
      type: 'paramRef',
    }));
}

function runAfterReferences({ runAfter }) {
  if (runAfter === undefined || runAfter === null) return [];

  return runAfter.map(after => ({
    ref: after,
    type: 'runAfterRef',
  }));
}

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
      const taskInCycle = Object.values<any>(pipeline.spec.tasks).find(task => task.name === taskNameInCycle);
      report(`Cycle found in tasks (dependency graph): ${[...cycle, cycle[0]].join(' -> ')}`, taskInCycle, 'name');
    }
  }
}

export default (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    errorCyclesInPipeline(pipeline, [runAfterReferences, paramsReferences, resourceInputReferences], report);
  }
};
