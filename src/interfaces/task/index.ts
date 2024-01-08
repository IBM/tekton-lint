import TaskSpec from './task-spec.js';

import { Base } from '../common.js';

interface Task extends Base {
    kind: 'Task';
    spec: TaskSpec;
}

export default Task;
