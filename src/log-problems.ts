import stylish from './formatters/stylish.js';
import vscode from './formatters/vscode.js';
import json from './formatters/json.js';
import { ToolConfig } from './config.js';

const formatters = {
    stylish,
    vscode,
    json,
};

const onlyErrors = (problems) => problems.filter((problem) => problem.level === 'error');

export default (cfg: ToolConfig, problems) => {
    if (!(cfg.format in formatters)) {
        process.exitCode = 1;
        return console.log(`Formatter "${cfg.format}" is not available!`);
    }

    const validProblems = cfg.quiet ? onlyErrors(problems) : problems;
    formatters[cfg.format](validProblems);
};
