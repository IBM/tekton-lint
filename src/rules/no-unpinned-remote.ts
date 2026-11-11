import { parseImage } from '../image.js';
import { hasVariableReference } from '../variables.js';

const COMMIT_SHA = /^[0-9a-f]{40}$/i;
// A revision that starts like this is a branch or tag whatever follows, so it is flagged even when parameterized
const BRANCH_OR_TAG = /^(?:refs\/)?(?:heads|tags)\//;
const MAX_DEPTH = 3;

const paramValue = (ref, name) => {
    if (!Array.isArray(ref.params)) return undefined;
    const param = ref.params.find((p) => p && p.name === name);
    return typeof param?.value === 'string' ? param.value : undefined;
};

function isPinnedRevision(revision: string | undefined): boolean {
    if (revision === undefined) return false;
    if (COMMIT_SHA.test(revision)) return true;
    // an unresolved variable cannot be judged statically, unless it is part of a branch or tag reference
    return hasVariableReference(revision) && !BRANCH_OR_TAG.test(revision);
}

function checkRef(ref, owner, report) {
    if (!ref || typeof ref !== 'object') return;

    // git resolver: require a commit SHA, since branches and tags can move
    const resolver = ref.resolver;
    if (resolver === 'git' && !isPinnedRevision(paramValue(ref, 'revision'))) {
        report(
            `${owner} uses the git resolver without pinning 'revision' to a commit SHA, so the referenced content can change`,
            ref,
            'resolver',
        );
    }

    // bundles, either the resolver or the older `bundle` field: require a digest
    const bundle =
        resolver === 'bundles' ? paramValue(ref, 'bundle') : typeof ref.bundle === 'string' ? ref.bundle : undefined;
    if (bundle && !hasVariableReference(bundle) && !parseImage(bundle).digest) {
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

function checkDoc(doc, report, depth = 0) {
    if (!doc || typeof doc !== 'object' || !doc.spec || typeof doc.spec !== 'object' || depth > MAX_DEPTH) return;
    const owner = `${doc.kind} '${doc.metadata?.name ?? doc.metadata?.generateName}'`;
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
        case 'TriggerTemplate':
            if (Array.isArray(doc.spec.resourcetemplates)) {
                for (const template of doc.spec.resourcetemplates) {
                    checkDoc(template, report, depth + 1);
                }
            }
            break;
    }
}

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        checkDoc(doc, report);
    }
};
