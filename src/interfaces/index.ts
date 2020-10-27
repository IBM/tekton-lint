import Task from './task';
import Pipeline from './pipeline';
import EventListener from './event-listener';
import TriggerBinding from './trigger-binding';
import TriggerTemplate from './trigger-template';

type TektonDefinition =
  Task |
  Pipeline |
  EventListener |
  TriggerBinding |
  TriggerTemplate

interface TektonDefinitions {
  [kind: string]: {
    [name: string]: TektonDefinition;
  };
}
export {
  Task,
  Pipeline,
  EventListener,
  TriggerBinding,
  TriggerTemplate,
  TektonDefinition,
  TektonDefinitions,
};
