export default (docs, tekton, report) => {
  for (const resources of Object.values(tekton)) {
    for (const resource of Object.values(resources)) {
      const labels = resource.metadata.labels;
      if (labels && labels['tekton.dev/deprecated'] === true) {
        report(`${resource.kind} '${resource.metadata.name}' is deprecated!`, labels, 'tekton.dev/deprecated');
      }
    }
  }
};
