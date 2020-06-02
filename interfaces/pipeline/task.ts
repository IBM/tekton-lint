import Condition from './condition';
import TaskSpecs from '../task/task-spec';
import Workspace from './workspace';

import { BaseName, ValueParam } from '../common';
import { TaskResource } from './resources';

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
