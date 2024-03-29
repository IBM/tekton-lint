import { Tekton } from '../interfaces/common.js';

export default (docs, tekton: Tekton, report) => {
    if (!tekton.tasks) {
        return;
    }

    for (const task of Object.values<any>(tekton.tasks!)) {
        if (!task.spec) continue;

        const templateEnvVars = new Set();

        if (task.spec.stepTemplate && task.spec.stepTemplate.env) {
            for (const env of task.spec.stepTemplate.env) {
                if (!templateEnvVars.has(env.name)) {
                    templateEnvVars.add(env.name);
                } else {
                    report(
                        `StepTemplate has env variable '${env.name}' duplicated in task '${task.metadata.name}'.`,
                        env,
                        'name',
                    );
                }
            }
        }

        for (const step of task.spec.steps) {
            if (!step.env) continue;
            const envVariables = new Set();
            for (const env of step.env) {
                if (!envVariables.has(env.name)) {
                    envVariables.add(env.name);
                } else {
                    report(
                        `Step '${step.name}' has env variable '${env.name}' duplicated in task '${task.metadata.name}'.`,
                        env,
                        'name',
                    );
                }
                if (templateEnvVars.has(env.name)) {
                    report(
                        `StepTemplate in task '${task.metadata.name}' and Step '${step.name}' define the same env variable.`,
                        env,
                        'name',
                    );
                }
            }
        }
    }
};
