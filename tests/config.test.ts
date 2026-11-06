import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config } from '../src/config.js';

describe('Config (Q3)', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-config-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    const make = (config: string) => new Config({ config, _: [], format: 'json', quiet: false });

    test('an empty .tektonlintrc.yaml falls back to defaults', () => {
        fs.writeFileSync(path.join(dir, '.tektonlintrc.yaml'), '');
        const cfg = make(dir);
        expect(cfg.rulesConfig.rules['no-latest-image']).toBe('warning');
    });

    test('a nonexistent --config path falls back to defaults instead of throwing', () => {
        const cfg = make(path.join(dir, 'does-not-exist'));
        expect(cfg.rulesConfig.rules['no-latest-image']).toBe('warning');
    });

    test('an explicit rc file path is read', () => {
        const file = path.join(dir, 'custom.yaml');
        fs.writeFileSync(file, 'rules:\n  no-latest-image: error\n');
        expect(make(file).rulesConfig.rules['no-latest-image']).toBe('error');
    });

    test('getDefaultConfig uses the json format and is not quiet', () => {
        const cfg = Config.getDefaultConfig();
        expect(cfg.format).toBe('json');
        expect(cfg.quiet).toBe(false);
    });
});
