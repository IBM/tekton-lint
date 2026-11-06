import { parseImage } from '../image.js';

const COMMIT_SHA = /^[0-9a-f]{40}$/i;

const paramValue = (ref, name) => {
    if (!Array.isArray(ref.params)) return undefined;
    const param = ref.params.find((p) => p && p.name === name);
    return typeof param?.value === 'string' ? param.value : undefined;
};

function checkRef(ref, owner, report) {
    if (!ref || typeof ref !== 'object') return;

    // git resolver: require a commit SHA, since branches and tags can move
    const resolver = ref.resolver;
    if (resolver === 'git') {
        const revision = paramValue(ref, 'revision');
        if (revision === undefined || (!revision.includes('$(') && !COMMIT_SHA.test(revision))) {
            report(
                `${owner} uses the git resolver without pinning 'revision' to a commit SHA, so the referenced content can change`,
                ref,
                'resolver',
            );
        }
    }

    // bundles, either the resolver or the older `bundle` field: require a digest
    const bundle =
        resolver === 'bundles' ? paramValue(ref, 'bundle') : typeof ref.bundle === 'string' ? ref.bundle : undefined;
    if (bundle && !bundle.includes('$(') && !parseImage(bundle).digest) {
        report(
            `${owner} references bundle '${bundle}' without a digest, so the content can change`,
            ref,
            resolver ? 'resolver' : 'bundle',
        );
    }
}

function checkPipelineSpec(spec, owner, report) {
    if (!spec || typeof spec !== 'object') return;
    for (const list of [spec.tasks, spec.finally]) {
        if (!Array.isArray(list)) continue;
        for (const task of list) {
            checkRef(task?.taskRef, `${owner} task '${task?.name}'`, report);
        }
    }
}

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        if (!doc || typeof doc !== 'object' || !doc.spec || typeof doc.spec !== 'object') continue;
        const owner = `${doc.kind} '${doc.metadata?.name}'`;
        switch (doc.kind) {
            case 'Pipeline':
                checkPipelineSpec(doc.spec, owner, report);
                break;
            case 'PipelineRun':
                checkRef(doc.spec.pipelineRef, owner, report);
                checkPipelineSpec(doc.spec.pipelineSpec, owner, report);
                break;
            case 'TaskRun':
                checkRef(doc.spec.taskRef, owner, report);
                break;
        }
    }
};
