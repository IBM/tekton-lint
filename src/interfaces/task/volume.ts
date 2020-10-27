import { BaseName } from '../common';

interface EmptyDirVolume extends BaseName {
  emtyDir: {};
}

interface ConfigMapVolume extends BaseName {
  configMap: {
    name: string;
    items?: {
      key: string;
      path: string;
    }[];
  };
}

interface PersistentVolumeClaimVolume extends BaseName {
  persistentVolumeClaim: {
    claimName: string;
  };
}

interface SecretVolume extends BaseName {
  secret: {
    secretName: string;
  };
}

type Volume = EmptyDirVolume | ConfigMapVolume | PersistentVolumeClaimVolume | SecretVolume;

export default Volume;
