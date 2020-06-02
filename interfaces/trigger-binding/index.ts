import { Base, ValueParam } from '../common';

interface TriggerBinding extends Base {
  kind: 'TriggerBinding';
  spec: {
    params: ValueParam[];
  };
}

export default TriggerBinding;
