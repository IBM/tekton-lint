interface Base {
  apiVersion: string;
  metadata: {
    name: string;
    namespace?: string;
  };
}

interface BaseName {
  name: string;
}

interface Param {
  name: string;
  description?: string;
  default?: string;
  type?: string;
}

interface ValueParam {
  name: string;
  value: string;
}

export {
  Base,
  Param,
  BaseName,
  ValueParam,
};
