import Trigger from './trigger';

import { Base } from '../common';

interface EventListener extends Base {
  kind: 'EventListener';
  spec: {
    triggers: Trigger[];
  };
  serviceType?: string;
}

export default EventListener;
