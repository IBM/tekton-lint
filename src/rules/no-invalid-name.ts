import collectResources from '../collect-resources.js';

const isValidName = (name) => {
    const valid = new RegExp('^[a-zA-Z_][a-z0-9-()$.]*$');
    return valid.test(name);
};

function getTaskParams(spec) {
    if (spec.inputs) return spec.inputs.params;
    return spec.params;
}

function checkInvalidParameterName(resources, report) {
    for (const resource of Object.values<any>(resources)) {
        if (!resource.spec) continue;

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
    const resources = collectResources(docs);

    for (const [kind, resourceMap] of Object.entries(resources)) {
        for (const resource of Object.values(resourceMap as any)) {
            if (!isValidName((resource as any).metadata.name)) {
                report(
                    `Invalid name for ${kind} '${
                        (resource as any).metadata.name
                    }'. Names should be in lowercase, alphanumeric, kebab-case format. and follow DNS subdomain names`,
                    (resource as any).metadata,
                    'name',
                );
            }
        }
    }
};
