import TaskSpec from './task-spec';

import { Base } from '../common';

interface Task extends Base {
  kind: 'Task';
  spec: TaskSpec;
}

export default Task;
