import { parseImage } from '../image.js';
import { collectContainers, collectTaskSpecs } from '../task-specs.js';

export default (docs, tekton, report) => {
    function check(container) {
        const image = container.image;
        if (typeof image !== 'string' || !image) return;

        const { tag, digest } = parseImage(image);
        // a digest pins the image exactly, whatever the tag says
        if (digest) return;
        // A variable in the final path segment (for example `$(params.image)`) can supply the name or tag,
        // so it cannot be judged statically. A variable only in the registry or namespace part
        // (`$(params.registry)/alpine`) leaves the tag fixed, so such images are still checked.
        const lastSegment = image.slice(image.lastIndexOf('/') + 1);
        if (lastSegment.includes('$(') && tag !== 'latest') return;

        if (tag === undefined || tag === 'latest') {
            report(`Invalid image: '${image}'. Specify the image tag instead of using ':latest'`, container, 'image');
        }
    }

    for (const doc of docs || []) {
        for (const taskSpec of collectTaskSpecs(doc)) {
            for (const container of collectContainers(taskSpec)) {
                check(container);
            }
        }
    }
};
