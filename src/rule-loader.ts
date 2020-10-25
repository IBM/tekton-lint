/* eslint-disable global-require */
const rules = {
  'no-resourceversion': require('./rules/no-resourceversion').default,

  // no-duplicate-env
  'no-duplicate-env': require('./rules/no-duplicate-env').default,

  // no-duplicate-param
  'no-duplicate-param': require('./rules/no-duplicate-param').default,

  // no-duplicate-resource
  'no-duplicate-resource': require('./rules/no-duplicate-resource').default,

  // no-extra-param
  'no-extra-param': require('./rules/no-extra-param').default,

  // no-invalid-dag
  'no-pipeline-task-cycle': require('./rules/no-pipeline-task-cycle').default,

  // no-invalid-name
  'no-invalid-name': require('./rules/no-invalid-name').default,

  // no-invalid-param-type
  'no-invalid-param-type': require('./rules/no-invalid-param-type').default,

  // no-latest-image
  'no-latest-image': require('./rules/no-latest-image').default,

  // no-missing-param
  'no-missing-param': require('./rules/no-missing-param').default,

  // no-missing-resource
  'no-missing-resource': require('./rules/no-missing-resource').default,
  'no-pipeline-missing-task': require('./rules/no-pipeline-missing-task').default, // TODO: split -> no-invalid-dag

  // no-missing-workspace
  'no-missing-workspace': require('./rules/no-missing-workspace').default,

  // no-undefined-param
  'no-undefined-param': require('./rules/no-undefined-param').default,

  // no-undefined-result
  'no-undefined-result': require('./rules/no-undefined-result').default,

  // no-undefined-volume
  'no-undefined-volume': require('./rules/no-undefined-volume').default,

  // no-unused-param
  'no-unused-param': require('./rules/no-unused-param').default,

  // prefer-beta
  'prefer-beta': require('./rules/prefer-beta').default,

  // prefer-kebab-case
  'prefer-kebab-case': require('./rules/prefer-kebab-case').default,

  // prefer-when-expression
  'prefer-when-expression': require('./rules/prefer-when-expression').default,

  // no-deprecated-resource
  'no-deprecated-resource': require('./rules/no-deprecated-resource').default,
};

export default rules;
