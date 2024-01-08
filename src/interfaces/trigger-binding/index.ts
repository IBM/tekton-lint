import { Base, ValueParam } from '../common.js';

interface TriggerBinding extends Base {
    kind: 'TriggerBinding';
    spec: {
        params: ValueParam[];
    };
}

export default TriggerBinding;
