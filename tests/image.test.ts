import { parseImage } from '../src/image.js';
import { lint } from '../src/rules.js';
import Reporter from '../src/reporter.js';
import { Config } from '../src/config.js';
import YAML from 'yaml';

describe('parseImage (T4)', () => {
    test.each([
        ['alpine', { name: 'alpine', tag: undefined, digest: undefined }],
        ['alpine:3.20', { name: 'alpine', tag: '3.20', digest: undefined }],
        ['alpine:latest', { name: 'alpine', tag: 'latest', digest: undefined }],
        ['localhost:5000/img', { name: 'localhost:5000/img', tag: undefined, digest: undefined }],
        ['localhost:5000/img:1.0', { name: 'localhost:5000/img', tag: '1.0', digest: undefined }],
        ['alpine@sha256:abc', { name: 'alpine', tag: undefined, digest: 'sha256:abc' }],
        ['alpine:3.20@sha256:abc', { name: 'alpine', tag: '3.20', digest: 'sha256:abc' }],
    ])('%s', (image, expected) => {
        expect(parseImage(image)).toEqual(expected);
    });
});

describe('prefer-image-digest (T4)', () => {
    const raw = `apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: t
spec:
  steps:
    - name: pinned
      image: alpine@sha256:abc
    - name: tagged
      image: alpine:3.20
    - name: var
      image: $(params.image)
`;

    async function run(level: string) {
        const config = Config.getDefaultConfig();
        config.rulesConfig.rules = { ...config.rulesConfig.rules, 'prefer-image-digest': level } as any;
        const doc = YAML.parseDocument(raw);
        const docs = [{ content: doc.toJSON(), raw, doc, path: 'test.yaml' }];
        return lint(
            docs.map((d) => d.content),
            new Reporter(docs as any),
            config.rulesConfig,
        );
    }

    test('is off by default', () => {
        expect(Config.getDefaultConfig().rulesConfig.rules['prefer-image-digest']).toBe('off');
    });

    test('flags images without a digest when enabled', async () => {
        const problems = (await run('warning')).filter((p) => p.rule === 'prefer-image-digest');
        expect(problems.map((p) => p.message)).toEqual([expect.stringContaining("'alpine:3.20'")]);
    });

    test('reports nothing when off', async () => {
        const problems = (await run('off')).filter((p) => p.rule === 'prefer-image-digest');
        expect(problems).toEqual([]);
    });
});
