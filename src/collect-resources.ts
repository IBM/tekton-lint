const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export default (docs: any[]) => {
    const resourceReducer = (obj: any, item: any) => {
        if (!item || !item.kind || !item.metadata || !item.metadata.name) return obj;
        if (DANGEROUS_KEYS.has(item.kind) || DANGEROUS_KEYS.has(item.metadata.name)) return obj;

        if (!Object.prototype.hasOwnProperty.call(obj, item.kind)) {
            obj[item.kind] = Object.create(null);
        }

        obj[item.kind][item.metadata.name] = item;

        if (item.spec && item.spec.resourcetemplates) {
            const { resourcetemplates } = item.spec;
            const subResources = resourcetemplates
                .filter((subItem: any) => subItem && subItem.kind !== 'undefined')
                .reduce(resourceReducer, Object.create(null));

            for (const [kind, resources] of Object.entries(subResources)) {
                if (!obj[kind]) obj[kind] = Object.create(null);
                Object.assign(obj[kind], resources);
            }
        }
        return obj;
    };

    return (docs || [])
        .filter((item) => item && item.kind && item.kind !== 'undefined')
        .reduce(resourceReducer, Object.create(null));
};
