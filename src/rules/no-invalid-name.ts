// Kubernetes DNS-1123 subdomain: dot-separated, non-empty labels of lowercase alphanumerics or '-',
// each starting and ending with an alphanumeric.
const DNS_1123_SUBDOMAIN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
const MAX_NAME_LENGTH = 253;

const isValidName = (name) => {
    if (typeof name !== 'string') return false;
    // Tekton variable substitutions, e.g. $(uid), are resolved at runtime; validate the surrounding text.
    const resolved = name.replace(/\$\([^()]*\)/g, 'x');
    return resolved.length <= MAX_NAME_LENGTH && DNS_1123_SUBDOMAIN.test(resolved);
};

function getTaskParams(spec) {
    if (spec.inputs) return spec.inputs.params;
    return spec.params;
}

function checkInvalidParameterName(resources, report) {
    for (const resource of Object.values<any>(resources || {})) {
        if (!resource || !resource.spec) continue;

        let params;
        if (resource.kind === 'Task') {
            params = getTaskParams(resource.spec);
        } else {
            params = resource.spec.params;
        }

        if (!params) continue;
        for (const param of params) {
            if (param.name && !/^[a-zA-Z_][a-zA-Z_\-0-9]*$/.test(param.name)) {
                report(
                    `${resource.kind} '${resource.metadata.name}' defines parameter '${param.name}' with invalid parameter name (names are limited to alpha-numeric characters, '-' and '_' and can only start with alpha characters and '_')`,
                    param,
                    'name',
                );
            }
        }
    }
}

export default (docs, tekton, report) => {
    checkInvalidParameterName(tekton.tasks, report);
    checkInvalidParameterName(tekton.conditions, report);
    checkInvalidParameterName(tekton.triggerTemplates, report);
    checkInvalidParameterName(tekton.pipelines, report);

    // Check resource names - iterate over docs directly to preserve instrumentation
    for (const resource of docs || []) {
        if (resource && resource.metadata && resource.metadata.name && resource.kind) {
            if (!isValidName(resource.metadata.name)) {
                report(
                    `Invalid name for ${resource.kind} '${resource.metadata.name}'. Names must be a DNS-1123 subdomain: lowercase alphanumeric characters, '-' or '.', start and end with an alphanumeric character, and be at most ${MAX_NAME_LENGTH} characters`,
                    resource.metadata,
                    'name',
                );
            }
        }
    }
};
