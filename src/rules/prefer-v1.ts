// Tekton kinds served as tekton.dev/v1 whose v1beta1 form can be migrated.
const V1_KINDS = new Set(['Task', 'Pipeline', 'TaskRun', 'PipelineRun']);

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        if (!doc || typeof doc !== 'object') continue;
        if (doc.apiVersion !== 'tekton.dev/v1beta1' || !V1_KINDS.has(doc.kind)) continue;
        report(
            `${doc.kind} '${doc.metadata?.name}' is defined with apiVersion tekton.dev/v1beta1, consider migrating to tekton.dev/v1`,
            doc,
            'apiVersion',
        );
    }
};
