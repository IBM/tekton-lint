import chalk from 'chalk';

/**
 * Strips credentials (username:password@ or token@) from URL strings.
 */
export function redactUrl(urlStr: string): string {
    if (typeof urlStr !== 'string') return urlStr;
    return urlStr.replace(/(https?|ssh):\/\/[^/@\s]+@/g, '$1://');
}

/**
 * Recursively scrubs credentials from objects, arrays, and strings for safe logging.
 */
export function sanitizeForLogging(obj: any, seen = new WeakSet()): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return redactUrl(obj);
    if (typeof obj !== 'object') return obj;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeForLogging(item, seen));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = redactUrl(key);
        sanitized[sanitizedKey] = sanitizeForLogging(value, seen);
    }
    return sanitized;
}

const PAC_TASK_ANNOTATION_PREFIX = 'pipelinesascode.tekton.dev/task-';
// Matches an optional "catalog://" prefix, then captures name and version.
// Version is the trailing "-N.N..." segment.
const PAC_VALUE_REGEXP = /^(?:[^/]+:\/\/)?([a-zA-Z0-9_.-]+?)-(\d+\.\d+[\w.]*)$/;

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

/**
 * Parses the part of a variable reference that follows its prefix, e.g. the
 * `.arr[0]` in `$(params.arr[0])` or the `['a'][*]` in `$(params['a'][*])`.
 * Returns the path segments, or null when the syntax is not recognised.
 */
function parseVariablePath(rest: string): string[] | null {
    const segments: string[] = [];
    let i = 0;
    while (i < rest.length) {
        if (rest[i] === '.') {
            let j = i + 1;
            while (j < rest.length && rest[j] !== '.' && rest[j] !== '[') j++;
            if (j === i + 1) return null;
            segments.push(rest.slice(i + 1, j));
            i = j;
        } else if (rest[i] === '[') {
            const end = rest.indexOf(']', i);
            if (end === -1) return null;
            const inner = rest.slice(i + 1, end);
            const quoted = inner.match(/^(['"])(.*)\1$/);
            if (!quoted && inner !== '*' && !/^\d+$/.test(inner)) return null;
            segments.push(quoted ? quoted[2] : inner);
            i = end + 1;
        } else {
            return null;
        }
    }
    return segments.length ? segments : null;
}

/**
 * Finds `$(<prefix>...)` variable references in a string and returns the path segments of each.
 * Handles the dot, bracket, array index, `[*]` and object key forms:
 * `$(params.a)`, `$(params.a[0])`, `$(params.a[*])`, `$(params.a.key)`, `$(params['a'])`, `$(params["a"][*])`.
 */
export function extractVariableRefs(text: string, prefix: string): string[][] {
    const refs: string[][] = [];
    const marker = `$(${prefix}`;
    let from = 0;
    for (;;) {
        const start = text.indexOf(marker, from);
        if (start === -1) break;
        const bodyStart = start + marker.length;
        const end = text.indexOf(')', bodyStart);
        if (end === -1) break;
        const body = text.slice(bodyStart, end);
        from = bodyStart;
        if (body.includes('(')) continue;
        const segments = parseVariablePath(body);
        if (segments) refs.push(segments);
        from = end + 1;
    }
    return refs;
}

/**
 * Resolves a reference to the name of the declared parameter it points at, preferring
 * the longest match (parameter names may themselves contain dots). Returns undefined when none match.
 */
export function resolveParamName(segments: string[], known: Iterable<string>): string | undefined {
    const names = known instanceof Set ? known : new Set(known);
    for (let n = segments.length; n > 0; n--) {
        const candidate = segments.slice(0, n).join('.');
        if (names.has(candidate)) return candidate;
    }
    return undefined;
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
