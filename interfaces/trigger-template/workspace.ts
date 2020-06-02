interface Workspace {
  name: string;
  persistentVolumeClaim?: {
    claimName: string;
  };
  subPath?: string;
}

export default Workspace;
