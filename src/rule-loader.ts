/* eslint-disable global-require */
const rules = {
  'no-deprecated-resource': require('./rules/no-deprecated-resource').default,
  'no-duplicate-env': require('./rules/no-duplicate-env').default,
  'no-duplicate-param': require('./rules/no-duplicate-param').default,
  'no-duplicate-resource': require('./rules/no-duplicate-resource').default,
  'no-extra-param': require('./rules/no-extra-param').default,
  'no-invalid-dag': require('./rules/no-invalid-dag').default,
  'no-invalid-name': require('./rules/no-invalid-name').default,
  'no-invalid-param-type': require('./rules/no-invalid-param-type').default,
  'no-latest-image': require('./rules/no-latest-image').default,
  'no-missing-param': require('./rules/no-missing-param').default,
  'no-missing-resource': require('./rules/no-missing-resource').default,
  'no-missing-workspace': require('./rules/no-missing-workspace').default,
  'no-resourceversion': require('./rules/no-resourceversion').default,
  'no-undefined-param': require('./rules/no-undefined-param').default,
  'no-undefined-result': require('./rules/no-undefined-result').default,
  'no-undefined-volume': require('./rules/no-undefined-volume').default,
  'no-unused-param': require('./rules/no-unused-param').default,
  'prefer-beta': require('./rules/prefer-beta').default,
  'prefer-kebab-case': require('./rules/prefer-kebab-case').default,
  'prefer-when-expression': require('./rules/prefer-when-expression').default,
};

export default rules;
