const logProblems = (problems) => {
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
};

module.exports = {
  logProblems,
};
