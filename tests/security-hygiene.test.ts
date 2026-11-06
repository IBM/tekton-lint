import { lint } from '../src/rules.js';
import Reporter from '../src/reporter.js';
import { Config } from '../src/config.js';
import YAML from 'yaml';
import fs from 'node:fs';

const raw = fs.readFileSync('./regression-tests/general/security-hygiene.yaml', 'utf-8');

async function run(rules: Record<string, string>) {
    const config = Config.getDefaultConfig();
    config.rulesConfig.rules = { ...config.rulesConfig.rules, ...rules } as any;
    const docs = YAML.parseAllDocuments(raw).map((doc) => ({
        content: doc.toJSON(),
        raw,
        doc,
        path: 'security-hygiene.yaml',
    }));
    return lint(
        docs.map((d) => d.content),
        new Reporter(docs as any),
        config.rulesConfig,
    );
}

const only = async (rule: string) => (await run({ [rule]: 'warning' })).filter((p) => p.rule === rule);

describe('security hygiene rules (T6)', () => {
    test('no-script-injection flags only steps that interpolate params into a script', async () => {
        const problems = await only('no-script-injection');
        expect(problems.map((p) => p.message.match(/Step '([^']+)'/)?.[1]).sort()).toEqual(['injectable', 's']);
    });

    test('no-insecure-security-context flags each unsafe setting once', async () => {
        const problems = await only('no-insecure-security-context');
        expect(problems).toHaveLength(4);
        expect(problems.every((p) => p.message.includes("Step 'privileged'"))).toBe(true);
    });

    test('no-hardcoded-secret flags only literal secret-like values', async () => {
        const problems = await only('no-hardcoded-secret');
        expect(problems).toHaveLength(1);
        expect(problems[0].message).toContain("'API_TOKEN'");
    });

    test('no-unpinned-remote is off by default', async () => {
        expect((await run({})).filter((p) => p.rule === 'no-unpinned-remote')).toEqual([]);
    });

    test('no-unpinned-remote flags unpinned git revisions and bundles when enabled', async () => {
        const problems = await only('no-unpinned-remote');
        expect(problems.map((p) => p.message.match(/task '([^']+)'/)?.[1]).sort()).toEqual([
            'bundle-unpinned',
            'git-unpinned-branch',
            'legacy-bundle',
        ]);
    });
});
