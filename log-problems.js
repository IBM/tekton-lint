/* eslint-disable global-require */
const formatters = {
  stylish: require('./formatters/stylish'),
  vscode: require('./formatters/vscode'),
  json: require('./formatters/json'),
};

const onlyErrors = problems => problems.filter(problem => problem.level === 'error');

module.exports = ({ format, quiet }, problems) => {
  if (!(format in formatters)) {
    process.exitCode = 1;
    return console.log(`Formatter "${format}" is not available!`);
  }

  const validProblems = quiet ? onlyErrors(problems) : problems;
  formatters[format](validProblems);
};
