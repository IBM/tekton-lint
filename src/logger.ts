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
                // stderr, so stdout stays clean for --format json consumers
                options: { destination: 2, level: 'error' },
            },
        ],
    });
} else {
    transports = pino.transport({
        targets: [
            {
                target: 'pino-pretty',
                level: 'error',
                // stderr, so stdout stays clean for --format json consumers
                options: { destination: 2, level: 'error' },
            },
        ],
    });
}

export const logger = pino.pino(
    {
        serializers: {
            err: pino.stdSerializers.err,
        },
    },
    transports,
);

export const usingLogfile = () => logfile;
