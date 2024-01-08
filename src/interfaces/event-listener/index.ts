import Trigger from './trigger.js';

import { Base } from '../common.js';

interface EventListener extends Base {
    kind: 'EventListener';
    spec: {
        triggers: Trigger[];
    };
    serviceType?: string;
}

export default EventListener;
