import { walk, pathToString } from '../walk';

const taskNameRegexp = /\$\(tasks\.(.*?)\..*?\)/;

const checkUndefinedResult = (pipeline, tekton, report) => (value, path, parent) => {
  const reference = value.toString().match(/\$\(tasks\.(.*?)\.results\.(.*?)\)/);
  if (!reference) return;

  const [, task, name] = reference;
  const matchingTask = pipeline.spec.tasks.find(t => t.name === task);
  if (!matchingTask) return;

  if (matchingTask.taskRef && !tekton.tasks[matchingTask.taskRef.name]) return;
  const taskSpec = matchingTask.taskSpec || tekton.tasks[matchingTask.taskRef.name].spec;

  const matchingResult = taskSpec.results.find(result => result.name === name);
  if (!matchingResult) {
    report(`In Pipeline '${pipeline.metadata.name}' the value on path '${pathToString(path)}' refers to an undefined output result (as '${value}' - '${name}' is not a result in Task '${task}')`, parent, path[path.length - 1]);
  }
};

export default (docs, tekton, report) => {
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    walk(pipeline, [], checkUndefinedResult(pipeline, tekton, report));
  }
  for (const pipeline of Object.values<any>(tekton.pipelines)) {
    for (const task of pipeline.spec.tasks) {
      if (!task.params) continue;
      for (const param of task.params) {
        if (typeof param.value !== 'string') continue;
        const taskReference = param.value.match(taskNameRegexp);
        if (taskReference) {
          const taskName = taskReference[1];
          const matchingTask = pipeline.spec.tasks.find(task => task.name === taskName);
          if (!matchingTask) {
            report(`Task '${task.name}' refers to task '${taskName}' at value of param '${param.name}' but there is no task with that name in pipeline '${pipeline.metadata.name}'`, param, 'value');
          }
        }
      }
    }
  }
};
