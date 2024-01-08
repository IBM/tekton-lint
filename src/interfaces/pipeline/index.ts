import Task from './task.js';
import Workspace from './workspace.js';

import { Base, Param } from '../common.js';
import { PipelineResource } from './resources.js';

interface Pipeline extends Base {
    kind: 'Pipeline';
    spec: {
        params?: Param[];
        resources?: PipelineResource[];
        workspaces?: Workspace[];
        tasks: Task[];
    };
}

export default Pipeline;
