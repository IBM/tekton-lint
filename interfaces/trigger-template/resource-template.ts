import Resource from './resource';
import Workspace from './workspace';

import { Base, BaseName, ValueParam } from '../common';

interface PipelineRun extends Base {
  kind: 'PipelineRun';
  spec: {
    pipelineRef: BaseName;
    params?: ValueParam[];
    workspaces?: Workspace[];
    resources?: Resource[];
    serviceAccountName?: string;
    timeout?: string;
  };
}

interface PipelineResource extends Base {
  kind: 'PipelineResource';
  spec: {
    type: string;
    params?: ValueParam;
  };
}

interface PersistentVolumeClaim extends Base {
  kind: 'PersistentVolumeClaim';
  spec: {
    resources: {
      requests: {
        storage: string;
      };
    };
    volumeMode: string;
    accessModes: string[];
  };
}

interface Secret extends Base {
  kind: 'Secret';
  type: string;
  data?: {
    [key: string]: string;
  };
  stringData?: {
    [key: string]: string;
  };
}

interface ServiceAccount extends Base {
  kind: 'ServiceAccount';
  imagePullSecrets?: BaseName[];
}

type ResourceTemplate = PipelineRun | PipelineResource | PersistentVolumeClaim | Secret | ServiceAccount;

export default ResourceTemplate;
