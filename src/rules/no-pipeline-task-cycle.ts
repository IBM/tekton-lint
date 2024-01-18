// Supports Pipeline and PipelineRun

import pkg from 'graphlib';
const { alg, Graph } = pkg;

import { RuleError } from '../errorbase.js';

const RESULT_PATTERN = '\\$\\(tasks\\.([^.]+)\\.results\\.[^.]*\\)';
const RESULT_REGEX_G = new RegExp(RESULT_PATTERN, 'g');
const RESULT_REGEX = new RegExp(RESULT_PATTERN);

function getReferences(str) {
    const matches = str.match(RESULT_REGEX_G);
    if (!matches) return [];
    return matches.map((substr) => substr.match(RESULT_REGEX)[1]);
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
        .map((ref) => ({
            ref,
            type: 'paramRef',
        }));
}

function runAfterReferences({ runAfter }) {
    if (runAfter === undefined || runAfter === null) return [];

    return runAfter.map((after) => ({
        ref: after,
        type: 'runAfterRef',
    }));
}

function resourceInputReferences(task) {
    const { resources } = task;
    if (resources === undefined || resources === null) return [];
    const { inputs } = resources;
    if (inputs === undefined || inputs === null) return [];
    const inputsFromTasks = inputs.filter((input) => input.from !== undefined);
    return inputsFromTasks.map((input) => ({
        ref: input.from,
        type: 'resourceRef',
    }));
}

function buildTaskGraph(name, tasks, referenceCreators) {
    const pipelineGraph = new Graph({ directed: true, multigraph: true });
    pipelineGraph.setGraph(name);
    if (!tasks || tasks.length === 0) {
        return pipelineGraph;
    }
    for (const task of tasks) {
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

function errorCyclesInPipeline(name, tasks, referenceCreators, report) {
    const pipelineTaskGraph = buildTaskGraph(name, tasks, referenceCreators);
    for (const cycle of alg.findCycles(pipelineTaskGraph)) {
        for (const taskNameInCycle of cycle) {
            const taskInCycle = Object.values<any>(tasks).find((task) => task.name === taskNameInCycle);
            report(
                `Cycle found in tasks (dependency graph): ${[...cycle, cycle[0]].join(' -> ')}`,
                taskInCycle,
                'name',
            );
        }
    }
}

export default (docs, tekton, report) => {
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        try {
            const name = pipeline.metadata.name;
            const tasks = pipeline.spec.tasks;
            errorCyclesInPipeline(name, tasks, [runAfterReferences, paramsReferences, resourceInputReferences], report);
        } catch (e) {
            throw new RuleError("Can't process", 'no-pipeline-task-cycle', pipeline.metadata.name);
        }
    }

    for (const pipeline of Object.values<any>(tekton.pipelineRuns)) {
        try {
            if (!pipeline.spec.pipelineSpec) continue;
            const name = pipeline.metadata.name;
            const tasks = pipeline.spec.pipelineSpec.tasks;
            errorCyclesInPipeline(name, tasks, [runAfterReferences, paramsReferences, resourceInputReferences], report);
        } catch (e) {
            throw new RuleError("Can't process", 'no-pipeline-task-cycle', pipeline.metadata.name);
        }
    }
};
