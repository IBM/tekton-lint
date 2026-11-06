import { parseImage } from '../image.js';
import { collectContainers, collectTaskSpecs } from '../task-specs.js';

export default (docs, tekton, report) => {
    function check(container) {
        const image = container.image;
        if (typeof image !== 'string' || !image) return;

        const { tag, digest } = parseImage(image);
        // a digest pins the image exactly, whatever the tag says
        if (digest) return;
        // unresolved variables (for example `$(params.image)`) cannot be judged statically
        if (image.includes('$(') && tag !== 'latest') return;

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
