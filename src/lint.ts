#! /usr/bin/env node

import yargs from 'yargs/yargs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import url from 'node:url';
import { Config } from './config.js';
import run from './runner.js';
import logProblems from './log-problems.js';

import { logger, usingLogfile } from './logger.js';

const p = path.resolve(path.dirname(new url.URL(import.meta.url).pathname), '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));

const parser = yargs(process.argv.slice(2))
    .usage('$0 [<options>]  <glob-pattern-to-yaml-files> ... ')
    .options({
        watch: { type: 'boolean', default: false, describe: ' Run tekton-lint in watch mode' },
        color: { type: 'boolean', default: true, describe: 'Forcefully enable/disable colored output' },
        format: {
            type: 'string',
            default: 'stylish',
            choices: ['vscode', 'stylish', 'json'],
            describe: 'Format output. Available formatters: vscode | stylish | json',
        },
        quiet: { type: 'boolean', default: false, describe: 'Report errors only' },
        'max-warnings': { type: 'number', default: -1, describe: 'Number of warnings to trigger nonzero exit code' },
        config: {
            type: 'string',
            default: process.cwd(),
            describe: 'location of the .tektonlintrc.yaml, defaults to cwd',
        },
        'refresh-cache': {
            type: 'boolean',
            default: 'false',
            describe: 'If true will delete the cache directory for external tasks',
        },
    })
    .version(pkg.version)
    .help()
    .example([
        ['tekton-lint "**/*.yaml"', ' Globstar matching'],
        ['tekton-lint path/to/my/pipeline.yaml "path/to/my/tasks/*.yaml"', ' Multiple glob patterns'],
        ['tekton-lint --watch "**/*.yaml"', 'Watch mode'],
    ]);

(async () => {
    const argv = await parser.argv;
    logger.info(argv);

    try {
        const cfg = new Config(argv);

        const problems = await run(cfg);
        logProblems(cfg, problems);

        // determine the process exit code
        const hasError = problems.some((p) => p.level === 'error');
        const warningCount = problems.filter((p) => p.level === 'warning').length;
        const tooManyWarnings = cfg.max_warnings >= 0 && warningCount > cfg.max_warnings;

        // eslint-disable-next-line no-process-env
        if ((hasError || tooManyWarnings) && process.env.NODE_ENV !== 'test') {
            process.exitCode = 1;
        } else {
            process.exitCode = 0;
        }
    } catch (e) {
        if (usingLogfile()) {
            logger.error(e as Error);
        } else {
            logger.error((e as Error).message);
        }

        process.exitCode = 1;
    }
})();
