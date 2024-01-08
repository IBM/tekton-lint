import Resources from './resources.js';
import Sidecar from './sidecar.js';
import Step from './step.js';
import StepTemplate from './step-template.js';
import Volume from './volume.js';
import Workspace from './workspace.js';

import { Param, BaseName } from '../common.js';

interface TaskSpec {
    steps: Step[];
    params?: Param[];
    resources?: Resources;
    workspaces?: Workspace[];
    stepTemplate?: StepTemplate;
    results?: BaseName[];
    volumes?: Volume[];
    sidecars?: Sidecar[];
}

export default TaskSpec;
