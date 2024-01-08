interface Resource {
    name: string;
    resource: string;
    from?: string[];
    optional?: boolean;
}

interface Resources {
    inputs: Resource[];
    outputs: Resource[];
}

export default Resources;
