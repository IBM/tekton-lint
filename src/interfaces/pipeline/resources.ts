interface Resource {
  name: string;
  resource: string;
  from?: string[];
}

interface PipelineResource {
  name: string;
  type: string;
}

interface TaskResource {
  inputs: Resource[];
  outputs: Resource[];
}

export {
  TaskResource,
  PipelineResource,
};
