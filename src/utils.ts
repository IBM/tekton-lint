import chalk from 'chalk';

export function formatLine(problem) {
  const level = problem.level === 'error' ? `${chalk.red(problem.level)}  ` : chalk.yellow(problem.level);
  if (problem.loc) {
    return `${level} (${problem.loc.startLine},${problem.loc.startColumn},${problem.loc.endLine},${problem.loc.endColumn}): ${problem.message}`;
  }
  return `${level}: ${problem.message}`;
};

export function logProblems(problems) {
  const groupByFile = problems.reduce((group, problem) => {
    group[problem.path] = (group[problem.path] || []).concat(problem);
    return group;
  }, {});

  for (const [file, fileProblems] of Object.entries<any>(groupByFile)) {
    console.log(`${chalk.bold(file)}:`);
    for (const problem of fileProblems) {
      console.log(formatLine(problem));
    }
    console.log('\n');
  }
};
