class Reporter {
  constructor() {
    this.problems = [];
  }

  error(message) {
    this.problems.push({
      message,
      level: 'error',
    });
  }

  warning(message) {
    this.problems.push({
      message,
      level: 'warning',
    });
  }
}

module.exports = Reporter;
