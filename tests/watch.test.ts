import { jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import watch from '../src/watch.js';
import { Config } from '../src/config.js';

const task = (image: string) =>
    `apiVersion: tekton.dev/v1\nkind: Task\nmetadata:\n  name: t\nspec:\n  steps:\n    - name: s\n      image: ${image}\n`;

const waitFor = async (check: () => boolean, timeoutMs = 5000) => {
    const start = Date.now();
    while (!check()) {
        if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for watch output');
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
};

describe('watch mode (Q1)', () => {
    let dir: string;
    let logSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-watch-'));
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        logSpy.mockRestore();
        fs.rmSync(dir, { recursive: true, force: true });
    });

    const finished = () => logSpy.mock.calls.filter((call) => call[0] === 'Tekton-lint finished running!').length;

    test('lints on start and again when a file changes', async () => {
        const file = path.join(dir, 't.yaml');
        fs.writeFileSync(file, task('alpine'));

        const cfg = new Config({ config: dir, _: [file], format: 'json', quiet: false });
        const watcher = watch(cfg);
        try {
            await waitFor(() => finished() >= 1);
            fs.writeFileSync(file, task('alpine:3.20'));
            await waitFor(() => finished() >= 2);
        } finally {
            await watcher.close();
        }
    });
});
