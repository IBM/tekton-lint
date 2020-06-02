import Task from './task';
import Workspace from './workspace';

import { Base, Param } from '../common';
import { PipelineResource } from './resources';

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
