import { collectContainers, collectPodTemplates, collectTaskSpecs } from '../task-specs.js';

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        for (const taskSpec of collectTaskSpecs(doc)) {
            for (const container of collectContainers(taskSpec)) {
                const context = container.securityContext;
                if (!context || typeof context !== 'object') continue;
                const name = container.name ?? 'stepTemplate';

                if (context.privileged === true) {
                    report(
                        `Step '${name}' runs privileged. Remove 'securityContext.privileged'`,
                        context,
                        'privileged',
                    );
                }
                if (context.allowPrivilegeEscalation === true) {
                    report(
                        `Step '${name}' allows privilege escalation. Set 'securityContext.allowPrivilegeEscalation' to false`,
                        context,
                        'allowPrivilegeEscalation',
                    );
                }
                if (context.runAsUser === 0) {
                    report(`Step '${name}' runs as root (runAsUser: 0). Use a non-root user`, context, 'runAsUser');
                }
                if (context.runAsNonRoot === false) {
                    report(
                        `Step '${name}' sets runAsNonRoot to false. Set 'securityContext.runAsNonRoot' to true`,
                        context,
                        'runAsNonRoot',
                    );
                }
            }
        }

        // pod-level settings apply to every step that does not override them
        for (const { owner, podTemplate } of collectPodTemplates(doc)) {
            const context = podTemplate.securityContext;
            if (!context || typeof context !== 'object') continue;

            if (context.runAsUser === 0) {
                report(`${owner} pod template runs as root (runAsUser: 0). Use a non-root user`, context, 'runAsUser');
            }
            if (context.runAsNonRoot === false) {
                report(
                    `${owner} pod template sets runAsNonRoot to false. Set 'securityContext.runAsNonRoot' to true`,
                    context,
                    'runAsNonRoot',
                );
            }
        }
    }
};
