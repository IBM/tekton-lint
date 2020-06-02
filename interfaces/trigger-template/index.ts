import ResourceTemplate from './resource-template';

import { Base, Param } from '../common';

interface TriggerTemplate extends Base {
  kind: 'TriggerTemplate';
  spec: {
    params: Param[];
    resourcetemplates: ResourceTemplate[];
  };
}

export default TriggerTemplate;
