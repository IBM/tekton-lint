import chalk from 'chalk';

const PAC_TASK_ANNOTATION_PREFIX = 'pipelinesascode.tekton.dev/task-';
// Matches an optional "catalog://" prefix, then captures name and version.
// Version is the trailing "-N.N..." segment (greedy name, last semver-like suffix).
const PAC_VALUE_REGEXP = /^(?:[^/]+:\/\/)?(.+)-(\d+\.\d+[\w.]*)$/;

/**
 * Parses pipelinesascode.tekton.dev/task-* annotations on a pipeline and
 * returns a map of { taskName -> requiredVersion }.
 * Example annotation value: "catalog-1://playwright-e2e-1.1"
 *   → { "playwright-e2e": "1.1" }
 */
export function parsePacTaskAnnotations(pipeline: any): Record<string, string> {
    const annotations = pipeline?.metadata?.annotations;
    if (!annotations) return {};

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries<string>(annotations)) {
        if (!key.startsWith(PAC_TASK_ANNOTATION_PREFIX)) continue;
        if (typeof value !== 'string') continue;
        const match = value.match(PAC_VALUE_REGEXP);
        if (!match) continue;
        const [, name, version] = match;
        result[name] = version;
    }
    return result;
}

/**
 * Resolves the correct task object for a given pipeline and task name.
 * When the pipeline has a PAC annotation pinning the task to a specific version,
 * that versioned task is returned. Falls back to tekton.tasks[taskName].
 */
export function resolveTask(tekton: any, pipeline: any, taskName: string): any {
    const versions = parsePacTaskAnnotations(pipeline);
    const requiredVersion = versions[taskName];
    if (requiredVersion) {
        return tekton.taskVersions?.[taskName]?.[requiredVersion] ?? tekton.tasks?.[taskName];
    }
    return tekton.tasks?.[taskName];
}

export function formatLine(problem) {
    const level = problem.level === 'error' ? `${chalk.red(problem.level)}  ` : chalk.yellow(problem.level);
    if (problem.loc) {
        return `${level} (${problem.loc.startLine},${problem.loc.startColumn},${problem.loc.endLine},${problem.loc.endColumn}): ${problem.message}`;
    }
    return `${level}: ${problem.message}`;
}

export function logProblems(problems) {
    const groupByFile = problems.reduce((group, problem) => {
        group[problem.path] = (group[problem.path] || []).concat(problem);
        return group;
    }, {});

    for (const [file, fileProblems] of Object.entries<any>(groupByFile)) {
        console.log(`${chalk.bold(file)}:`);
        for (const problem of fileProblems) {
            console.log(formatLine(problem));
        }
        console.log('\n');
    }
}
