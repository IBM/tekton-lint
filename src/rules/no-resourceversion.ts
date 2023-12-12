import collectResources from '../collect-resources.js';

const checkInvalidResourceKey = (invalidKey, resources, report) => {
    Object.entries(resources).forEach(([type, resourceList]) => {
        Object.entries(resourceList as any).forEach(([name, resource]) => {
            if ((resource as any).metadata[invalidKey]) {
                report(
                    `Resource ${type} '${name}' has an invalid '${invalidKey}' key in its resource definition.`,
                    (resource as any).metadata,
                    invalidKey,
                );
            }
        });
    });
};

export default (docs: any, tekton: any, report: any) => {
    const resources = collectResources(docs);
    checkInvalidResourceKey('resourceVersion', resources, report);
};
