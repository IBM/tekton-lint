/* eslint-disable global-require */
const formatters = {
  stylish: require('./formatters/stylish'),
  vscode: require('./formatters/vscode'),
  json: require('./formatters/json'),
};

module.exports = ({ format }, problems) => {
  if (!(format in formatters)) {
    process.exitCode = 1;
    return console.log(`Formatter "${format}" is not available!`);
  }

  formatters[format](problems);
};
