import { walk, pathToString } from '../walk.js';

const isValidKebabName = (name) => {
    const valid = new RegExp('^[a-z0-9-()$.]*$');
    return valid.test(name);
};

const isValidCamelName = (name) => {
    const valid = new RegExp('^[a-z_][a-z0-9A-Z()$.]*$');
    return valid.test(name);
};

const isValidName = (name) => {
    return isValidKebabName(name) || isValidCamelName(name);
};

const naming = (resource, prefix, report) => (node, path, parent) => {
    let name = node;
    const isNameDefinition = /.name$/.test(path);

    if (path.includes('env') && path.includes('name')) return;

    if (isNameDefinition && !isValidName(name)) {
        report(
            `Invalid name for '${name}' at ${pathToString(
                path,
            )} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case or camelCase format.`,
            parent,
            'name',
        );
        return;
    }

    const parameterPlacementRx = new RegExp(`\\$\\(${prefix}.(.*?)\\)`);
    const m = node && node.toString().match(parameterPlacementRx);

    if (m) {
        name = m[1];
        if (!isValidName(name)) {
            report(
                `Invalid name for '${name}' at ${pathToString(
                    path,
                )} in '${resource}'. Names should be in lowercase, alphanumeric, kebab-case or camelCase format.`,
                parent,
                path[path.length - 1],
            );
        }
    }
};

export default (docs, tekton, report) => {
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        walk(pipeline.spec.tasks, ['spec', 'tasks'], naming(pipeline.metadata.name, 'params', report));
        walk(pipeline.spec.finally, ['spec', 'finally'], naming(pipeline.metadata.name, 'params', report));
    }

    for (const pipeline of Object.values<any>(tekton.pipelineRuns)) {
        walk(pipeline.spec.tasks, ['spec', 'pipelineSpec', 'tasks'], naming(pipeline.metadata.name, 'params', report));
        walk(
            pipeline.spec.finally,
            ['spec', 'pipelineSpec', 'finally'],
            naming(pipeline.metadata.name, 'params', report),
        );
    }
};
