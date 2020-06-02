import Resources from './resources';
import Sidecar from './sidecar';
import Step from './step';
import StepTemplate from './step-template';
import Volume from './volume';
import Workspace from './workspace';

import { Param, BaseName } from '../common';

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
