import { TaskResource } from './resources.js';
import { Base, ValueParam } from '../common.js';

interface Condition extends Base {
    conditionRef: string;
    params?: ValueParam[];
    resources?: TaskResource[];
}

export default Condition;
