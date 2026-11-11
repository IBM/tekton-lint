import { collectContainers, collectTaskSpecs } from '../task-specs.js';

// $(params.x), $(params['x']), $(tt.params.x) and the v1alpha1 form $(inputs.params.x)
const INJECTABLE = /\$\((?:tt\.|inputs\.)?params(?:\.|\[)/;

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        for (const taskSpec of collectTaskSpecs(doc)) {
            for (const container of collectContainers(taskSpec)) {
                if (typeof container.script !== 'string' || !INJECTABLE.test(container.script)) continue;
                report(
                    `Step '${container.name}' interpolates a parameter into its script, which allows script injection. Pass it through 'env' and reference the environment variable instead`,
                    container,
                    'script',
                );
            }
        }
    }
};
