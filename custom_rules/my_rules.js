
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

// could export multiple rules if you wished here. 
module.exports = {
    rules: [
        {
            name: 'no-tasks-called-task',
            reportDefault: 'error',
            ruleFn: forbidTasksWithTaskInTheName
        }
    ]
}
