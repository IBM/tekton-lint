import Condition from './condition.js';
import TaskSpecs from '../task/task-spec.js';
import Workspace from './workspace.js';

import { BaseName, ValueParam } from '../common.js';
import { TaskResource } from './resources.js';

interface BaseTask {
    name: string;
    params?: ValueParam[];
    resources?: TaskResource;
    workspaces?: Workspace[];
    conditions?: Condition[];
    runAfter?: string[];
    retries?: number;
}

interface TaskRef extends BaseTask {
    taskRef: BaseName;
}

interface TaskSpec extends BaseTask {
    taskSpec: TaskSpecs;
}

type Task = TaskRef | TaskSpec;

export default Task;
