import stylish from './formatters/stylish.js';
import vscode from './formatters/vscode.js';
import json from './formatters/json.js';

const formatters = {
    stylish,
    vscode,
    json,
};

const onlyErrors = (problems) => problems.filter((problem) => problem.level === 'error');

export default ({ format, quiet }, problems) => {
    if (!(format in formatters)) {
        process.exitCode = 1;
        return console.log(`Formatter "${format}" is not available!`);
    }

    const validProblems = quiet ? onlyErrors(problems) : problems;
    formatters[format](validProblems);
};
