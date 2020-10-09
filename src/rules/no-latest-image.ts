export default (docs, tekton, report) => {
  function check(step) {
    if (!step) return;
    const image = step.image;
    if (!image) return;
    if (/:latest$/.test(image) || /^[^:$]*$/.test(image)) {
      report(`Invalid image: '${image}'. Specify the image tag instead of using ':latest'`, step, 'image');
    }
  }

  for (const task of Object.values<any>(tekton.tasks)) {
    check(task.spec.stepTemplate);
    for (const step of Object.values(task.spec.steps)) {
      check(step);
    }
  }
};
