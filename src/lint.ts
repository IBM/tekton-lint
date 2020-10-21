#!/usr/bin/env node

import minimist from 'minimist';
import watch from './watch';
import run from './runner';
import logProblems from './log-problems';
const pkg = require('../package.json');

const argv = minimist(process.argv.slice(2), {
  boolean: ['watch'],
  default: {
    format: 'vscode',
  },
});

const usageMessage = `Usage:
tekton-lint <path-to-yaml-files>

Options:
$ tekton-lint --watch                # Run tekton-lint in watch mode
$ tekton-lint --version              # Show version number
$ tekton-lint --help                 # Show help
$ tekton-lint --color / --no-color   # Forcefully enable/disable colored output
$ tekton-lint --format               # Format output. Available formatters: vscode (default) | stylish | json
$ tekton-lint --quiet                # Report errors only - default: false
$ tekton-lint --max-warnings <Int>   # Number of warnings to trigger nonzero exit code - default: -1

Examples:
# Globstar matching
$ tekton-lint '**/*.yaml'

# Exact file path
$ tekton-lint my-pipeline.yaml my-task.yaml

# Multiple glob patterns
$ tekton-lint path/to/my/pipeline.yaml 'path/to/my/tasks/*.yaml'

# Watch mode
$ tekton-lint --watch '**/*.yaml'
`;

(() => {
  if (argv.version) {
    return console.log(`Version: ${pkg.version}`);
  }

  if (argv.help) {
    return console.log(usageMessage);
  }

  if (argv._.length === 0) {
    return console.log(usageMessage);
  }

  if (+process.version.slice(1).split('.')[0] < 12) {
    process.exitCode = 1;
    return console.log(`The current node version is ${process.version}, but at least v12.0.0 is required`);
  }

  let maxWarnings = -1;
  if (argv['max-warnings'] !== undefined) {
    if (typeof argv['max-warnings'] !== 'number') {
      process.exitCode = 1;
      return console.log(`Invalid value for 'max-warnings' option. Expected a number, received value: ${argv['max-warnings']}.`);
    }
    maxWarnings = argv['max-warnings'];
  }

  if (argv.watch) {
    watch(argv._);
  } else {
    run(argv._)
      .then((problems) => {
        logProblems(argv as any, problems);

        const hasError = problems.some(p => p.level === 'error');
        const warningCount = problems.filter(p => p.level === 'warning').length;
        const tooManyWarnings = maxWarnings >= 0 && warningCount > maxWarnings;
        // eslint-disable-next-line no-process-env
        if ((hasError || tooManyWarnings) && process.env.NODE_ENV !== 'test') {
          return 1;
        }
        return 0;
      }, (error) => {
        console.error(error.message);
        return 1;
      })
      .then((code) => {
        process.exitCode = code;
      });
  }
})();
