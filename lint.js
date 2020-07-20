#!/usr/bin/env node

const { version } = require('./package.json');
const argv = require('minimist')(process.argv.slice(2), {
  boolean: ['watch'],
});
const watch = require('./watch');
const run = require('./rules');
const { logProblems } = require('./utils');
const usageMessage = `Usage:
tekton-lint <path-to-yaml-files>

Options:
$ tekton-lint --watch   # Run tekton-lint in watch mode
$ tekton-lint --version # Show version number
$ tekton-lint --help    # Show help
$ tekton-lint --color / --no-color   # Forcefully enable/disable colored output

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

if (argv.version) {
  return console.log(`Version: ${version}`);
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

if (argv.watch) {
  watch(argv._);
} else {
  run(argv._)
    .then((problems) => {
      logProblems(problems);

      // eslint-disable-next-line no-process-env
      if (problems.some(p => p.level === 'error') && process.env.NODE_ENV !== 'test') {
        process.exitCode = 1;
      }
    }, (error) => {
      console.error(error);
    });
}
