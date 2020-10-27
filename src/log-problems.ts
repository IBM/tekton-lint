import stylish from './formatters/stylish';
import vscode from './formatters/vscode';
import json from './formatters/json';
import { Problem } from './reporter';

const formatters = {
  stylish,
  vscode,
  json,
};

const onlyErrors = (problems: Problem[]) => problems.filter(problem => problem.level === 'error');

export default ({ format, quiet }, problems: Problem[]) => {
  if (!(format in formatters)) {
    process.exitCode = 1;
    return console.log(`Formatter "${format}" is not available!`);
  }

  const validProblems = quiet ? onlyErrors(problems) : problems;
  formatters[format](validProblems);
};
