import { BaseName } from '../common';

interface ValueVariable extends BaseName {
  value: string;
}

interface AnnotationVariable extends BaseName {
  valueFrom: {
    fieldRef: {
      fieldPath: string;
    };
  };
}

interface SecretKeyVariable extends BaseName {
  valueFrom: {
    secretKeyRef: {
      name: string;
      key: string;
    };
  };
}

interface ConfigMapKeyVariable extends BaseName {
  valueFrom: {
    configMapKeyRef: {
      name: string;
      key: string;
    };
  };
}

type Variable = ValueVariable | AnnotationVariable | SecretKeyVariable | ConfigMapKeyVariable;

interface StepTemplate {
  env?: Variable[];
}

export default StepTemplate;
