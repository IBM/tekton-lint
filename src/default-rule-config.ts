import { RulesConfig } from './interfaces/common.js';

const defaultRules: RulesConfig = {
    rules: {
        'no-duplicate-param': 'error',
        'no-invalid-name': 'error',
        'no-invalid-param-type': 'error',
        'no-pipeline-missing-parameters': 'error',
        'no-pipeline-missing-task': 'error',
        'no-pipeline-task-cycle': 'error',
        'no-extra-param': 'error',
        'no-missing-workspace': 'error',
        'no-undefined-result': 'error',
        'no-missing-param': 'error',
        'no-duplicate-resource': 'error',
        'no-resourceversion': 'error',
        'no-duplicate-env': 'error',
        'no-undefined-volume': 'error',
        'no-latest-image': 'warning',
        'prefer-beta': 'warning',
        'prefer-kebab-case': 'warning',
        'prefer-camel-kebab-case': 'off',
        'no-unused-param': 'warning',
        'no-missing-resource': 'error',
        'no-undefined-param': 'error',
        'prefer-when-expression': 'warning',
        'no-deprecated-resource': 'warning',
        'no-missing-hashbang': 'warning',
    },
    'external-tasks': [],
};

export default defaultRules;
