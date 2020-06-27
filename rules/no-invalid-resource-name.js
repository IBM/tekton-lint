const collectResources = require('../collect-resources');
const isValidName = (name) => {
  const valid = new RegExp('^[a-z0-9-()$.]*$');
  return valid.test(name);
};

module.exports = (docs, tekton, report) => {
  const resources = collectResources(docs);

  for (const [kind, resourceMap] of Object.entries(resources)) {
    for (const resource of Object.values(resourceMap)) {
      if (!isValidName(resource.metadata.name)) {
        report(`Invalid name for ${kind} '${resource.metadata.name}'. Names should be in lowercase, alphanumeric, kebab-case format.`, resource.metadata, 'name');
      }
    }
  }
};
