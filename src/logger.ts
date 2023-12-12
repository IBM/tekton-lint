/*
 * SPDX-License-Identifier: Apache-2.0
 */

import pino from 'pino';
import env from 'env-var';

const logfile = env.get('TL_DEBUG').default('false').asBool();

let transports;

if (logfile) {
    transports = pino.transport({
        targets: [
            {
                target: 'pino/file',
                level: 'trace',
                options: { destination: `app.log`, append: false },
            },
            {
                target: 'pino-pretty',
                level: 'error',
                options: { destination: 1, level: 'error' }, // use 2 for stderr
            },
        ],
    });
} else {
    transports = pino.transport({
        targets: [
            {
                target: 'pino-pretty',
                level: 'error',
                options: { destination: 1, level: 'error' }, // use 2 for stderr
            },
        ],
    });
}

export const logger = pino.pino(transports);
