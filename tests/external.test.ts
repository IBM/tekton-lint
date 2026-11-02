import { jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Replace git with a fake so no network or real clone is needed.
// The fake records its arguments and creates the clone dir with a tasks/ folder,
// a symlink pointing outside the clone, and a README.
type ExecCall = { file: string; args: string[]; env: NodeJS.ProcessEnv };
const calls: ExecCall[] = [];
let failWith: (Error & { stderr?: Buffer }) | undefined;
let outsideFile = '';

const execFileSync = jest.fn((file: unknown, args: unknown, options: unknown) => {
    const a = args as string[];
    calls.push({ file: file as string, args: a, env: (options as { env: NodeJS.ProcessEnv }).env });
    if (failWith) {
        throw failWith;
    }
    const cloneDir = a[a.length - 1];
    fs.mkdirSync(path.join(cloneDir, 'tasks'), { recursive: true });
    fs.writeFileSync(path.join(cloneDir, 'tasks', 'task.yaml'), 'kind: Task\n');
    fs.writeFileSync(path.join(cloneDir, 'README.md'), 'readme\n');
    fs.symlinkSync(outsideFile, path.join(cloneDir, 'tasks', 'evil-link.yaml'));
    return Buffer.from('');
});

jest.unstable_mockModule('node:child_process', () => ({
    default: { execFileSync },
    execFileSync,
}));

const { getExternal, collectAllExternal } = await import('../src/external');

let cacheDir: string;
const cfg = () => ({ cache_dir: cacheDir }) as never;

function tektonlintTmpDirs(): string[] {
    return fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('tektonlint'));
}

beforeAll(() => {
    outsideFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tl-outside-')), 'secret.txt');
    fs.writeFileSync(outsideFile, 'top secret');
});

beforeEach(() => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-cache-test-'));
    calls.length = 0;
    failWith = undefined;
    execFileSync.mockClear();
});

afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
});

afterAll(() => {
    fs.rmSync(path.dirname(outsideFile), { recursive: true, force: true });
});

describe('getExternal rejects invalid repo input before cloning', () => {
    describe.each([
        ['ext transport', 'ext::sh -c touch% /tmp/pwned', /unsupported protocol/],
        ['file transport', 'file:///etc/passwd', /unsupported protocol/],
        ['http (not https)', 'http://example.com/org/repo.git', /unsupported protocol/],
        ['git transport', 'git://example.com/org/repo.git', /unsupported protocol/],
        ['ssh host option injection', 'ssh://-oProxyCommand=touch%20/tmp/pwned/org/repo.git', /invalid host/],
        ['ssh user option injection', 'ssh://%2DoProxyCommand=x@example.com/org/repo.git', /invalid host/],
        ['https host starting with dash', 'https://-bad/org/repo.git', /invalid host/],
    ])('%s', (_name, repo, message) => {
        it('throws and never runs git or touches the filesystem', () => {
            const before = tektonlintTmpDirs();
            expect(() => getExternal(repo, ['tasks'], cfg())).toThrow(message);
            expect(execFileSync).not.toHaveBeenCalled();
            expect(tektonlintTmpDirs()).toEqual(before);
            expect(fs.readdirSync(cacheDir)).toEqual([]);
        });
    });

    it.each(['', 'not a url', 'git@github.com:org/repo.git', '/local/path'])('throws on unparsable url %p', (repo) => {
        expect(() => getExternal(repo, ['tasks'], cfg())).toThrow();
        expect(execFileSync).not.toHaveBeenCalled();
    });

    it('does not put credentials in the error for a rejected url', () => {
        let message = '';
        try {
            getExternal('http://user:s3cret@example.com/org/repo.git', ['tasks'], cfg());
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toMatch(/unsupported protocol/);
        expect(message).not.toContain('s3cret');
    });
});

describe('getExternal invokes git safely', () => {
    it('runs git directly (no shell) with option terminator and hardened env', () => {
        getExternal('https://example.com/org/repo.git', ['tasks'], cfg());

        expect(calls).toHaveLength(1);
        const { file, args, env } = calls[0];
        expect(file).toBe('git');
        expect(args).toContain('--no-recurse-submodules');
        expect(args).toContain('core.symlinks=false');
        const terminator = args.indexOf('--');
        expect(terminator).toBeGreaterThan(-1);
        expect(args[terminator + 1]).toBe('https://example.com/org/repo.git');
        expect(env.GIT_ALLOW_PROTOCOL).toBe('https:ssh');
        expect(env.GIT_TERMINAL_PROMPT).toBe('0');
    });

    it('passes shell metacharacters in the url as a single literal argument', () => {
        const repo = 'https://example.com/org/repo.git;touch$IFS/tmp/pwned&&id';
        getExternal(repo, ['tasks'], cfg());
        const { args } = calls[0];
        expect(args[args.indexOf('--') + 1]).toBe(new URL(repo).href);
        expect(args.filter((a) => a.includes('pwned'))).toHaveLength(1);
    });
});

describe('getExternal path handling', () => {
    it.each([
        ['parent traversal', '../../etc'],
        ['deep traversal', 'tasks/../../../etc'],
        ['absolute path', '/etc'],
        ['the repo root itself', '.'],
        ['empty path', ''],
    ])('rejects %s subpath', (_name, subpath) => {
        expect(() => getExternal('https://example.com/org/repo.git', [subpath], cfg())).toThrow(/escapes repository/);
    });

    it('does not write outside the cache dir on rejected subpath', () => {
        expect(() => getExternal('https://example.com/org/repo.git', ['../../etc'], cfg())).toThrow();
        const leaked = path.join(path.dirname(cacheDir), 'etc');
        expect(fs.existsSync(leaked)).toBe(false);
    });

    it('rejects a later bad subpath even if earlier ones were fine', () => {
        expect(() => getExternal('https://example.com/org/repo.git', ['tasks', '../x'], cfg())).toThrow(
            /escapes repository/,
        );
    });

    it('copies valid subpaths into the cache', () => {
        getExternal('https://example.com/org/repo.git', ['tasks', 'README.md'], cfg());
        const dest = path.join(cacheDir, 'repo', 'org');
        expect(fs.readFileSync(path.join(dest, 'tasks', 'task.yaml'), 'utf8')).toBe('kind: Task\n');
        expect(fs.existsSync(path.join(dest, 'README.md'))).toBe(true);
    });

    it('does not copy symlinks that point outside the clone', () => {
        getExternal('https://example.com/org/repo.git', ['tasks'], cfg());
        const link = path.join(cacheDir, 'repo', 'org', 'tasks', 'evil-link.yaml');
        expect(fs.existsSync(link)).toBe(false);
        expect(() => fs.lstatSync(link)).toThrow();
    });
});

describe('getExternal cleanup and error handling', () => {
    it('removes the temp clone dir on success', () => {
        const before = tektonlintTmpDirs();
        getExternal('https://example.com/org/repo.git', ['tasks'], cfg());
        expect(tektonlintTmpDirs()).toEqual(before);
    });

    it('removes the temp clone dir when the clone fails', () => {
        const before = tektonlintTmpDirs();
        failWith = Object.assign(new Error('Command failed: git clone'), { stderr: Buffer.from('fatal: nope') });
        expect(() => getExternal('https://example.com/org/repo.git', ['tasks'], cfg())).toThrow(/Command failed/);
        expect(tektonlintTmpDirs()).toEqual(before);
    });

    it('removes the temp clone dir when a subpath is rejected', () => {
        const before = tektonlintTmpDirs();
        expect(() => getExternal('https://example.com/org/repo.git', ['../x'], cfg())).toThrow();
        expect(tektonlintTmpDirs()).toEqual(before);
    });

    it('scrubs credentials from the thrown error', () => {
        failWith = Object.assign(
            new Error('Command failed: git clone -- https://user:s3cret@example.com/org/repo.git /tmp/x'),
            { stderr: Buffer.from("fatal: unable to access 'https://user:s3cret@example.com/org/repo.git/'") },
        );
        let message = '';
        try {
            getExternal('https://user:s3cret@example.com/org/repo.git', ['tasks'], cfg());
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toMatch(/Command failed/);
        expect(message).not.toContain('s3cret');
    });
});

describe('collectAllExternal', () => {
    const makeCfg = (externals: unknown[]) =>
        ({ cache_dir: cacheDir, rulesConfig: { 'external-tasks': externals } }) as never;

    it('returns nothing and does not clone when no external-tasks are configured', () => {
        expect(collectAllExternal({ cache_dir: cacheDir, rulesConfig: {} } as never)).toEqual([]);
        expect(execFileSync).not.toHaveBeenCalled();
    });

    it('skips entries with no path instead of passing undefined', () => {
        collectAllExternal(makeCfg([{ uri: 'https://example.com/org/repo.git' }]));
        // repo is still cloned, but with nothing to copy and no crash
        expect(fs.existsSync(path.join(cacheDir, 'repo', 'org', 'undefined'))).toBe(false);
    });

    it('propagates validation errors for a malicious uri', () => {
        expect(() => collectAllExternal(makeCfg([{ uri: 'ext::sh -c id', path: 'tasks' }]))).toThrow(
            /unsupported protocol/,
        );
        expect(execFileSync).not.toHaveBeenCalled();
    });
});
