import { Document } from 'yaml';

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

// ref: https://dev.to/ankittanna/how-to-create-a-type-for-complex-json-object-in-typescript-d81
type JSONValue = string | number | boolean | { [x: string]: JSONValue } | Array<JSONValue>;

export interface Doc {
    content: JSONValue;
    doc: Document;
    path: string;
    raw: string;
    no_report: boolean;
}

export interface RulesConfig {
    rules: {
        [rule: string]: 'off' | 'warning' | 'error';
    };
    'external-tasks': ExternalResource[];
}

export type RuleReportFn = (message: string, node, prop) => void;

export type RuleFn = (docs, tekton: Tekton, report: RuleReportFn) => void;

export { Tekton, Base, Param, BaseName, ValueParam, ExternalResource };
