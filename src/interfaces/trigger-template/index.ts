import ResourceTemplate from './resource-template.js';

import { Base, Param } from '../common.js';

interface TriggerTemplate extends Base {
    kind: 'TriggerTemplate';
    spec: {
        params: Param[];
        resourcetemplates: ResourceTemplate[];
    };
}

export default TriggerTemplate;
