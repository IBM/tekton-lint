/* eslint-disable global-require */
const rules = {
  'no-resourceversion': require('./rules/no-resourceversion.js'),

  // no-duplicate-env
  'no-duplicate-env': require('./rules/no-duplicate-env.js'),

  // no-duplicate-param
  'no-duplicate-param': require('./rules/no-duplicate-param.js'),

  // no-duplicate-resource
  'no-duplicate-resource': require('./rules/no-duplicate-resource.js'),

  // no-extra-param
  'no-extra-param': require('./rules/no-extra-param.js'),

  // no-invalid-dag
  'no-pipeline-task-cycle': require('./rules/no-pipeline-task-cycle.js'),

  // no-invalid-name
  'no-invalid-name': require('./rules/no-invalid-name.js'),

  // no-invalid-param-type
  'no-binding-missing-params': require('./rules/no-binding-missing-params.js'),
  'no-wrong-param-type': require('./rules/no-wrong-param-type.js'),
  'no-pipeline-task-missing-params': require('./rules/no-pipeline-task-missing-params.js'),

  // no-latest-image
  'no-latest-image': require('./rules/no-latest-image.js'),

  // no-missing-param
  'no-missing-param': require('./rules/no-missing-param.js'),

  // no-missing-resource
  'no-missing-resource': require('./rules/no-missing-resource.js'),
  'no-pipeline-missing-task': require('./rules/no-pipeline-missing-task.js'), // TODO: split -> no-invalid-dag

  // no-missing-workspace
  'no-missing-workspace': require('./rules/no-missing-workspace.js'),

  // no-undefined-param
  'no-undefined-param': require('./rules/no-undefined-param.js'),

  // no-undefined-result
  'no-undefined-result': require('./rules/no-undefined-result.js'),

  // no-undefined-volume
  'no-undefined-volume': require('./rules/no-undefined-volume.js'),

  // no-unused-param
  'no-unused-param': require('./rules/no-unused-param.js'),

  // prefer-beta
  'prefer-beta': require('./rules/prefer-beta.js'),

  // prefer-kebab-case
  'prefer-kebab-case': require('./rules/prefer-kebab-case.js'),

  // prefer-when-expression
  'prefer-when-expression': require('./rules/prefer-when-expression.js'),
};

module.exports = rules;
