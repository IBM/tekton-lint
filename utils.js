const chalk = require('chalk');

const logProblems = (problems) => {
  const groupByFile = problems.reduce((group, problem) => {
    group[problem.path] = (group[problem.path] || []).concat(problem);
    return group;
  }, {});

  for (const [file, fileProblems] of Object.entries(groupByFile)) {
    console.log(`${chalk.bold(file)}:`);
    for (const problem of fileProblems) {
      const level = problem.level === 'error' ? `${chalk.red(problem.level)}  ` : chalk.yellow(problem.level);
      if (problem.loc) {
        console.log(`${level} (${problem.loc.startLine},${problem.loc.startColumn},${problem.loc.endLine},${problem.loc.endColumn}): ${problem.message}`);
      } else {
        console.log(`${level}: ${problem.message}`);
      }
    }
    console.log('\n');
  }
};

module.exports = {
  logProblems,
};
