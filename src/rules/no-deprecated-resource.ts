export default (docs, tekton, report) => {
    for (const resources of Object.values(tekton)) {
        for (const resource of Object.values(resources as any)) {
            const labels = (resource as any).metadata.labels;
            if (labels && labels['tekton.dev/deprecated'] === true) {
                report(
                    `${(resource as any).kind} '${(resource as any).metadata.name}' is deprecated!`,
                    labels,
                    'tekton.dev/deprecated',
                );
            }
        }
    }
};
