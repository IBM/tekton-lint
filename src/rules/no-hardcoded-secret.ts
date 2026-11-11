import { collectContainers, collectTaskSpecs } from '../task-specs.js';
import { hasVariableReference } from '../variables.js';

const SECRET_NAME = /(password|passwd|secret|token|api[_-]?key|private[_-]?key|credential)/i;

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        for (const taskSpec of collectTaskSpecs(doc)) {
            for (const container of collectContainers(taskSpec)) {
                if (!Array.isArray(container.env)) continue;
                for (const entry of container.env) {
                    if (!entry || typeof entry !== 'object' || entry.valueFrom) continue;
                    if (typeof entry.name !== 'string' || !SECRET_NAME.test(entry.name)) continue;
                    // empty values and Tekton variables (for example $(params.token)) are not literals
                    if (typeof entry.value !== 'string' || entry.value === '' || hasVariableReference(entry.value)) {
                        continue;
                    }
                    report(
                        `Environment variable '${entry.name}' looks like a secret but is set to a literal value. Use 'valueFrom.secretKeyRef' instead`,
                        entry,
                        'value',
                    );
                }
            }
        }
    }
};
