module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    const volumes = (task.spec.volumes || []).map(volume => volume.name);

    for (const step of task.spec.steps) {
      const mounts = step.volumeMounts || [];
      for (const mount of mounts) {
        if (mount.name.match(/\$\(.*\)/)) continue;
        if (!volumes.includes(mount.name)) {
          report(`Task '${task.metadata.name}' wants to mount volume '${mount.name}' in step '${step.name}', but this volume is not defined.`, mount, 'name');
        }
      }
    }
  }
};
