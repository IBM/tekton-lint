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

type listResources = {
    [key: string]: Base;
};

interface ExternalResource {
    name: string;
    uri: string;
    path: string;
}

interface Tekton {
    tasks?: listResources;
    pipelines?: listResources;
    listeners?: listResources;
    triggerTemplates?: listResources;
    triggerBindings?: listResources;
    conditions?: listResources;
    externaltasks?: ExternalResource[];
}

export { Tekton, Base, Param, BaseName, ValueParam, ExternalResource };
