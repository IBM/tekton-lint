import { BaseName } from '../common';

interface BaseTrigger {
  name? : string;
  template: BaseName;
}

interface BindingTrigger extends BaseTrigger {
  binding: BaseName;
}

interface BindingsTrigger extends BaseTrigger {
  bindings: {
    name?: string;
    ref?: string;
  }[];
}

type Trigger = BindingTrigger | BindingsTrigger;

export default Trigger;
