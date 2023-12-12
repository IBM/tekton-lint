const rules = {
    'no-resourceversion': (await import('./rules/no-resourceversion.js')).default,

    // no-duplicate-env
    'no-duplicate-env': (await import('./rules/no-duplicate-env.js')).default,

    // no-duplicate-param
    'no-duplicate-param': (await import('./rules/no-duplicate-param.js')).default,

    // no-duplicate-resource
    'no-duplicate-resource': (await import('./rules/no-duplicate-resource.js')).default,

    // no-extra-param
    'no-extra-param': (await import('./rules/no-extra-param.js')).default,

    // no-invalid-dag
    'no-pipeline-task-cycle': (await import('./rules/no-pipeline-task-cycle.js')).default,

    // no-invalid-name
    'no-invalid-name': (await import('./rules/no-invalid-name.js')).default,

    // no-invalid-param-type
    'no-invalid-param-type': (await import('./rules/no-invalid-param-type.js')).default,

    // no-latest-image
    'no-latest-image': (await import('./rules/no-latest-image.js')).default,

    // no-missing-param
    'no-missing-param': (await import('./rules/no-missing-param.js')).default,

    // no-missing-resource
    'no-missing-resource': (await import('./rules/no-missing-resource.js')).default,
    'no-pipeline-missing-task': (await import('./rules/no-pipeline-missing-task.js')).default, // TODO: split -> no-invalid-dag

    // no-missing-workspace
    'no-missing-workspace': (await import('./rules/no-missing-workspace.js')).default,

    // no-undefined-param
    'no-undefined-param': (await import('./rules/no-undefined-param.js')).default,

    // no-undefined-result
    'no-undefined-result': (await import('./rules/no-undefined-result.js')).default,

    // no-undefined-volume
    'no-undefined-volume': (await import('./rules/no-undefined-volume.js')).default,

    // no-unused-param
    'no-unused-param': (await import('./rules/no-unused-param.js')).default,

    // prefer-beta
    'prefer-beta': (await import('./rules/prefer-beta.js')).default,

    // prefer-kebab-case
    'prefer-kebab-case': (await import('./rules/prefer-kebab-case.js')).default,

    // prefer-when-expression
    'prefer-when-expression': (await import('./rules/prefer-when-expression.js')).default,

    // no-deprecated-resource
    'no-deprecated-resource': (await import('./rules/no-deprecated-resource.js')).default,

    // no-missing-hashbang
    'no-missing-hashbang': (await import('./rules/no-missing-hashbang.js')).default,
};

export default rules;
