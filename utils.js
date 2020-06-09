const logProblems = (problems) => {
  for (const problem of problems) {
    if (problem.loc) {
      console.log(`${problem.path}(${problem.loc.startLine},${problem.loc.startColumn},${problem.loc.endLine},${problem.loc.endColumn}): ${problem.level}: ${problem.message}`);
    } else {
      console.log(`${problem.path}: ${problem.level}: ${problem.message}`);
    }
  }
};

module.exports = {
  logProblems,
};
