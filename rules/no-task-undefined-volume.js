module.exports = (docs, tekton, report) => {
  for (const task of Object.values(tekton.tasks)) {
    let volumes = [];
    if (task.spec.volumes) {
      volumes = Object.values(task.spec.volumes).map(volume => volume.name);
    }

    for (const step of Object.values(task.spec.steps)) {
      if (typeof step.volumeMounts === 'undefined') continue;

      for (const mount of Object.values(step.volumeMounts)) {
        if (!volumes.includes(mount.name)) {
          report(`Task '${task.metadata.name}' wants to mount volume '${mount.name}' in step '${step.name}', but this volume is not defined.`, mount, 'name');
        }
      }
    }
  }
};
