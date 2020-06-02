import StepTemplate from './step-template';

interface BaseStep extends StepTemplate {
  name?: string;
  image: string;
  workingDir?: string;
  imagePullPolicy?: 'Always' | 'IfNotPresent' | 'Never';
  volumeMounts?: {
    name: string;
    mountPath: string;
    readOnly: boolean;
  }[];
}

interface CommandStep extends BaseStep {
  command: string[];
  args: string[];
}

interface ScriptStep extends BaseStep {
  script: string;
}

type Step = ScriptStep | CommandStep;

export default Step;
