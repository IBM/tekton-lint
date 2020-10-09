import collectResources from '../collect-resources';

const checkInvalidResourceKey = (invalidKey, resources, report) => {
  Object.entries(resources).forEach(([type, resourceList]) => {
    Object.entries(resourceList).forEach(([name, resource]) => {
      if (resource.metadata[invalidKey]) {
        report(`Resource ${type} '${name}' has an invalid '${invalidKey}' key in its resource definition.`, resource.metadata, invalidKey);
      }
    });
  });
};

export default (docs, tekton, report) => {
  const resources = collectResources(docs);
  checkInvalidResourceKey('resourceVersion', resources, report);
};
