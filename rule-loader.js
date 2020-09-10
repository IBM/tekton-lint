/* eslint-disable global-require */
const rules = {
  'no-resourceversion': require('./rules/no-resourceversion.js'),

  // no-duplicate-env
  'no-task-step-duplicate-env': require('./rules/no-task-step-duplicate-env.js'),

  // no-duplicate-param
  'no-duplicate-param': require('./rules/no-duplicate-param.js'),

  // no-duplicate-resource
  'no-resource-redefine': require('./rules/no-resource-redefine.js'),

  // no-extra-param
  'no-pipeline-task-extra-params': require('./rules/no-pipeline-task-extra-params.js'),
  'no-pipeline-taskspec-extra-params': require('./rules/no-pipeline-taskspec-extra-params.js'),
  'no-template-pipeline-extra-parameters': require('./rules/no-template-pipeline-extra-parameters.js'),

  // no-invalid-dag
  'no-pipeline-task-cycle': require('./rules/no-pipeline-task-cycle.js'),

  // no-invalid-name
  'no-invalid-parameter-name': require('./rules/no-invalid-parameter-name.js'),
  'no-invalid-resource-name': require('./rules/no-invalid-resource-name.js'),

  // no-invalid-param-type
  'no-binding-missing-params': require('./rules/no-binding-missing-params.js'),
  'no-wrong-param-type': require('./rules/no-wrong-param-type.js'),

  // no-latest-image
  'no-latest-image': require('./rules/no-latest-image.js'),

  // no-missing-param
  'no-pipeline-task-missing-params': require('./rules/no-pipeline-task-missing-params.js'), // TODO: split -> no-invalid-param-type
  'no-pipeline-taskspec-missing-params': require('./rules/no-pipeline-taskspec-missing-params.js'),
  'no-template-pipeline-missing-parameters': require('./rules/no-template-pipeline-missing-parameters.js'),

  // no-missing-resource
  'no-missing-resource': require('./rules/no-missing-resource.js'),
  'no-pipeline-missing-task': require('./rules/no-pipeline-missing-task.js'), // TODO: split -> no-invalid-dag

  // no-missing-workspace
  'no-pipeline-task-missing-workspace': require('./rules/no-pipeline-task-missing-workspace.js'),
  'no-template-pipeline-missing-workspace': require('./rules/no-template-pipeline-missing-workspace.js'),

  // no-undefined-param
  'no-pipeline-task-undefined-params': require('./rules/no-pipeline-task-undefined-params.js'),
  'no-task-undefined-params': require('./rules/no-task-undefined-params.js'),
  'no-template-undefined-params': require('./rules/no-template-undefined-params.js'),

  // no-undefined-result
  'no-undefined-result': require('./rules/no-undefined-result.js'),

  // no-undefined-volume
  'no-undefined-volume': require('./rules/no-undefined-volume.js'),

  // no-unused-param
  'no-unused-param': require('./rules/no-unused-param.js'),

  // prefer-beta
  'no-params-api-mix': require('./rules/no-params-api-mix.js'),
  'prefer-beta-version': require('./rules/prefer-beta-version.js'),

  // prefer-kebab-case
  'prefer-kebab-naming': require('./rules/prefer-kebab-naming.js'),
};

module.exports = rules;
