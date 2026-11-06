import { collectTaskSpecs } from '../task-specs.js';

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        for (const spec of collectTaskSpecs(doc)) {
            const volumes = (spec.volumes || []).map((volume) => volume.name);

            for (const step of spec.steps || []) {
                const mounts = step.volumeMounts || [];
                for (const mount of mounts) {
                    if (typeof mount.name !== 'string' || mount.name.match(/\$\(.*\)/)) continue;
                    if (!volumes.includes(mount.name)) {
                        report(
                            `${doc.kind} '${doc.metadata.name}' wants to mount volume '${mount.name}' in step '${step.name}', but this volume is not defined.`,
                            mount,
                            'name',
                        );
                    }
                }
            }
        }
    }
};
