import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import table from 'text-table';

const pluralize = (word, count) => (count === 1 ? word : `${word}s`);

const groupByPath = (problems) => {
  const groups = {};

  for (const problem of problems) {
    if (!groups[problem.path]) {
      groups[problem.path] = [];
    }

    groups[problem.path].push(problem);
  }

  return groups;
};

const messageRow = (obj) => {
  const location = obj.loc || {};
  const level = obj.level === 'error' ? chalk.red('error') : chalk.yellow('warning');
  return [
    '',
    location.startLine || 0,
    location.startColumn || 0,
    level,
    obj.message.replace(/([^ ])\.$/u, '$1'),
    chalk.dim(obj.rule || ''),
  ];
};

export default (results) => {
  let output = `\n`;

  for (const [path, problems] of Object.entries<any>(groupByPath(results))) {
    output += `${chalk.underline(path)}\n`;

    const section = table(
      problems.map(messageRow),
      {
        align: ['', 'r', 'l'],
        stringLength(str) {
          return stripAnsi(str).length;
        },
      },
    )
    .split(`\n`)
    .map(el => el.replace(/(\d+)\s+(\d+)/u, (m, p1, p2) => chalk.dim(`${p1}:${p2}`)))
    .join(`\n`);

    output += `${section}\n\n`;
  }

  let errorCount = 0;
  let warningCount = 0;
  let summaryColor = 'yellow';

  results.forEach((result) => {
    if (result.level === 'error') {
      errorCount += 1;
    } else {
      warningCount += 1;
    }
  });

  if (errorCount > 0) {
    summaryColor = 'red';
  }

  const total = errorCount + warningCount;

  if (total > 0) {
    output += chalk[summaryColor].bold([
        '\u2716 ', total, pluralize(' problem', total),
        ' (', errorCount, pluralize(' error', errorCount), ', ',
        warningCount, pluralize(' warning', warningCount), ')\n',
    ].join(''));

    // Resets output color, for prevent change on top level
    console.log(chalk.reset(output));
  }

  console.log('');
};
