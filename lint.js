#!/usr/bin/env node

const { version } = require('./package.json');
const watch = require('./watch');
const run = require('./rules');
const { logProblems } = require('./utils');

const usageMessage = `Usage:
tekton-lint <path-to-yaml-files>

Options:
$ tekton-lint --watch   # Run tekton-lint in watch mode
$ tekton-lint --version # Show version number
$ tekton-lint --help    # Show help

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

let watchMode = false;

if (process.argv[2]) {
  if (process.argv[2] === '--version') {
    return console.log(`Version: ${version}`);
  }
  if (process.argv[2] === '--help') {
    return console.log(usageMessage);
  }
  if (process.argv[2] === '--watch') {
    if (process.argv.slice(3).length === 0) {
      return console.log(usageMessage);
    }
    watchMode = true;
  }
} else {
  return console.log(usageMessage);
}

if (+process.version.slice(1).split('.')[0] < 12) {
  process.exitCode = 1;
  return console.log(`The current node version is ${process.version}, but at least v12.0.0 is required`);
}

if (watchMode) {
  watch(process.argv.slice(3));
} else {
  run(process.argv.slice(2))
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
