export default (docs, tekton, report) => {
    const resourceNames = new Map();

    for (const resource of docs || []) {
        if (!resource || !resource.kind || !resource.metadata || !resource.metadata.name) continue;
        if (!resourceNames.has(resource.kind)) {
            resourceNames.set(resource.kind, new Set());
        }
        const names = resourceNames.get(resource.kind);
        if (names.has(resource.metadata.name)) {
            report(
                `'${resource.metadata.name}' is already defined (as a '${resource.kind}')`,
                resource.metadata,
                'name',
            );
        }
        names.add(resource.metadata.name);
    }
};
