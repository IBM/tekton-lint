# Tekton Lint custom rules

- Create a regular node module
- Default export from this of an object
```js
module.exports = {
    rules: [
        {
            name: 'no-tasks-called-task',
            reportDefault: 'error',
            ruleFn: forbidTasksWithTaskInTheName
        }
    ]
}
```
    - Must contain a field called `rules` that is a array of objects
    - Each 'rule' object, must hava name (kebab case preferred)
    - Default report type (off/error/warning)
    - Reference to the rules function

- Rules are implemented in a function

```js
// Example rule to check a name of a task, note this isn't meant
// to be a serious rule - rather as an example
const forbidTasksWithTaskInTheName = (docs, tekton, report) => {

    // try to always code defensively
    if (tekton.tasks) {
        for (const t of Object.values(tekton.tasks)) {
            if (t.metadata.name.startsWith("Task")) {
                report("Tasks should not start with word 'Task'", t)
            }
        }
    }
};
```

    - `docs` are the full yaml docs
    - `tekton` is the object with the parsed elements of the yaml files
    - `report` is a fn to report rule breaks


## Development Notes:

- As well as the yaml files from the project being tested, the rule will also see the cached elements
- try and code as defensively as possible, eg a set of files might not have Tasks
