const walk = require('../walk');

const checkUndefinedResult = (pipeline, tekton, report) => (value, path, parent) => {
  const resultReference = value.toString().match(/\$\(tasks\.(.*?)\.results\.(.*?)\)/);
  if (!resultReference) return;

  const resultTask = resultReference[1];
  const resultName = resultReference[2];
  const matchingTask = pipeline.spec.tasks.find(task => task.name === resultTask);
  if (!matchingTask) return;

  let taskSpec;
  if (matchingTask.taskRef) {
    const matchingTaskSpec = Object.values(tekton.tasks).find(task => task.metadata.name === matchingTask.taskRef.name);
    if (!matchingTaskSpec) return;
    taskSpec = matchingTaskSpec.spec;
  } else {
    if (!matchingTask.taskSpec) return;
    taskSpec = matchingTask.taskSpec;
  }

  const matchingResult = taskSpec.results.find(result => result.name === resultName);
  if (!matchingResult) {
    report(`In Pipeline '${pipeline.metadata.name}' the value on path '${path}' refers to an undefined output result (as '${value}' - '${resultName}' is not a result in Task '${resultTask}')`, parent, path.split('.').slice(-1)[0]);
  }
};

module.exports = (docs, tekton, report) => {
  for (const pipeline of Object.values(tekton.pipelines)) {
    walk(pipeline, '', checkUndefinedResult(pipeline, tekton, report));
  }
};
