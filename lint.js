#!/usr/bin/env node

const { version } = require('./package.json');
const run = require('./rules');

const usageMessage = `Usage:
tekton-lint <path-to-yaml-files>

Options:
$ tekton-lint --version # Show version number
$ tekton-lint --help    # Show help

Examples:
# Globstar matching
$ tekton-lint '**/*.yaml'

# Exact file path
$ tekton-lint my-pipeline.yaml my-task.yaml

# Multiple glob patterns
$ tekton-lint path/to/my/pipeline.yaml 'path/to/my/tasks/*.yaml'`;

if (process.argv[2]) {
  if (process.argv[2] === '--version') {
    return console.log(`Version: ${version}`);
  }
  if (process.argv[2] === '--help') {
    return console.log(usageMessage);
  }
} else {
  return console.log(usageMessage);
}

if (+process.version.slice(1).split('.')[0] < 12) {
  process.exitCode = 1;
  return console.log(`The current node version is ${process.version}, but at least v12.0.0 is required`);
}

run(process.argv.slice(2))
  .then((problems) => {
    for (const problem of problems) {
      switch (problem.level) {
        case 'warning':
          console.log(`Warning: ${problem.message}`);
          break;
        case 'error':
          console.log(`Error: ${problem.message}`);
          break;
      }
    }

    // eslint-disable-next-line no-process-env
    if (problems.some(p => p.level === 'error') && process.env.NODE_ENV !== 'test') {
      process.exitCode = 1;
    }
  }, (error) => {
    console.error(error);
  });
