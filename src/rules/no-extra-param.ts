function getTaskParams(spec) {
    if (spec.inputs) return spec.inputs.params ?? [];
    return spec.params ?? [];
}

export default (docs, tekton, report) => {
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        // include any finally tasks if they are present
        const tasks = [...pipeline.spec.tasks, ...(pipeline.spec.finally ? pipeline.spec.finally : [])];
        for (const task of tasks) {
            if (task.taskRef) {
                const name = task.taskRef.name;

                if (!tekton.tasks[name]) continue;

                if (task.params) {
                    const provided = task.params.map((param) => param.name);
                    const params = getTaskParams(tekton.tasks[name].spec);
                    const all = params.map((param) => param.name);
                    const extra = provided.filter((param) => !all.includes(param));

                    for (const param of extra) {
                        report(
                            `Pipeline '${pipeline.metadata.name}' references task '${name}' (as '${task.name}'), and supplies parameter '${param}' to it, but it's not a valid parameter`,
                            task.params.find((p) => p.name === param),
                        );
                    }
                }
            }
        }
    }
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        // include any finally tasks if they are present
        const tasks = [...pipeline.spec.tasks, ...(pipeline.spec.finally ? pipeline.spec.finally : [])];
        for (const task of tasks) {
            if (task.taskSpec) {
                const params = getTaskParams(task.taskSpec);
                if (task.params == null && params == null) continue;

                if (params == null) {
                    const provided = task.params.map((param) => param.name);
                    for (const param of provided) {
                        report(
                            `Pipeline '${pipeline.metadata.name}' references task '${task.name}', and supplies parameter '${param}' to it, but it's not a valid parameter`,
                            task.params.find((p) => p.name === param),
                        );
                    }
                } else if (task.params && task.params !== null) {
                    const provided = task.params.map((param) => param.name);
                    const all = params.map((param) => param.name);

                    const extra = provided.filter((param) => !all.includes(param));

                    for (const param of extra) {
                        report(
                            `Pipeline '${pipeline.metadata.name}' references task '${task.name}', and supplies parameter '${param}' to it, but it's not a valid parameter`,
                            task.params.find((p) => p.name === param),
                        );
                    }
                }
            }
        }
    }
    for (const pipeline of Object.values<any>(tekton.pipelines)) {
        for (const template of Object.values<any>(tekton.triggerTemplates)) {
            // iterate on the resources that athe pipelinelins
            const matchingResource = template.spec.resourcetemplates.filter(
                (item) => item.spec && item.spec.pipelineRef && item.spec.pipelineRef.name === pipeline.metadata.name,
            );

            if (matchingResource.length == 0) continue;
            for (const resource of matchingResource) {
                const pipelineParams = pipeline.spec.params || [];
                const templateParams = resource.spec.params || [];
                const extra = templateParams.filter(
                    (templateParam) =>
                        !pipelineParams.some((pipelineParam) => pipelineParam.name === templateParam.name),
                );

                for (const param of extra) {
                    report(
                        `TriggerTemplate '${template.metadata.name}' references pipeline '${pipeline.metadata.name}', and supplies '${param.name}', but it's not a valid parameter.`,
                        templateParams.find((p) => p.name === param.name),
                    );
                }
            }
        }
    }

    for (const template of Object.values<any>(tekton.triggerTemplates)) {
        // iterate on the resources that athe pipelinelins
        const matchingResource = template.spec.resourcetemplates.filter((item) => item.spec && item.spec.pipelineSpec);

        if (matchingResource.length == 0) continue;
        for (const resource of matchingResource) {
            const pipeline = resource.spec.pipelineSpec;

            const pipelineParams = pipeline.params || [];
            const templateParams = resource.spec.params || [];

            const extra = templateParams.filter(
                (templateParam) => !pipelineParams.some((pipelineParam) => pipelineParam.name === templateParam.name),
            );
            for (const param of extra) {
                report(
                    `TriggerTemplate '${template.metadata.name}' references pipeline '${resource.metadata.name}', and supplies '${param.name}', but it's not a valid parameter.`,
                    templateParams.find((p) => p.name === param.name),
                );
            }
        }
    }

    // for (const pr of Object.values<any>(tekton.pipelineRuns)) {
    //     for (const task in pr.spec.pipelineSpec.tasks) {
    //         console.log(task);
    //     }
    // }
};
