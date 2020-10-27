import { TaskResource } from './resources';
import { Base, ValueParam } from '../common';

interface Condition extends Base {
  conditionRef: string;
  params?: ValueParam[];
  resources?: TaskResource[];
  kind: string;
}

export default Condition;
