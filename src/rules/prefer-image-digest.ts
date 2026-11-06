import { parseImage } from '../image.js';
import { collectContainers, collectTaskSpecs } from '../task-specs.js';

export default (docs, tekton, report) => {
    for (const doc of docs || []) {
        for (const taskSpec of collectTaskSpecs(doc)) {
            for (const container of collectContainers(taskSpec)) {
                const image = container.image;
                if (typeof image !== 'string' || !image || image.includes('$(')) continue;
                if (!parseImage(image).digest) {
                    report(
                        `Image '${image}' is not pinned by digest. Use 'name@sha256:<digest>' so the image cannot change`,
                        container,
                        'image',
                    );
                }
            }
        }
    }
};
