import child_process from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// import stream from 'node:stream';
import { logger } from './logger.js';
import { Config } from './config.js';
import { sanitizeForLogging } from './utils.js';

import { ExternalResource } from './interfaces/common.js';

const appPrefix = 'tektonlint';

const allowedProtocols = ['https:', 'ssh:'];

// strip credentials so tokens in https://user:token@host/... never reach logs or errors
function redact(uri: URL): string {
    const copy = new URL(uri.href);
    copy.username = '';
    copy.password = '';
    return copy.href;
}

function isInside(parent: string, child: string): boolean {
    return child.startsWith(parent + path.sep);
}

export function getExternal(repo: string, subpath: string[], cfg: Config) {
    // parse and validate before any network or filesystem work
    const uri = new URL(repo);
    if (!allowedProtocols.includes(uri.protocol)) {
        throw new Error(`unsupported protocol for external repo: ${redact(uri)}`);
    }
    // a host or user starting with '-' can be parsed by ssh as an option (CVE-2017-1000117 class)
    if (!uri.hostname || uri.hostname.startsWith('-') || decodeURIComponent(uri.username).startsWith('-')) {
        throw new Error(`invalid host in external repo: ${redact(uri)}`);
    }

    const cacheDir = path.resolve(cfg.cache_dir);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));
    const cloneDir = path.join(tmpDir, 'repo');

    try {
        // execFileSync: no shell, so repo cannot inject commands. '--' stops option parsing.
        // core.symlinks=false: symlinks in the remote repo become plain files, so they can't
        // point the copy (or later glob) at files outside the clone.
        // GIT_ALLOW_PROTOCOL: block ext::, file:, and redirects to other transports.
        child_process.execFileSync(
            'git',
            ['-c', 'core.symlinks=false', 'clone', '--depth', '1', '--no-recurse-submodules', '--', repo, cloneDir],
            {
                stdio: ['ignore', 'pipe', 'pipe'],
                timeout: 30000,
                maxBuffer: 10 * 1024 * 1024,
                env: {
                    PATH: process.env.PATH || '',
                    HOME: process.env.HOME || tmpDir,
                    GIT_ALLOW_PROTOCOL: 'https:ssh',
                    GIT_TERMINAL_PROMPT: '0',
                    GIT_CONFIG_NOSYSTEM: '1',
                    GIT_CONFIG_GLOBAL: '/dev/null',
                    ...(process.env.HTTPS_PROXY ? { HTTPS_PROXY: process.env.HTTPS_PROXY } : {}),
                    ...(process.env.HTTP_PROXY ? { HTTP_PROXY: process.env.HTTP_PROXY } : {}),
                    ...(process.env.NO_PROXY ? { NO_PROXY: process.env.NO_PROXY } : {}),
                    ...(process.env.SSL_CERT_FILE ? { SSL_CERT_FILE: process.env.SSL_CERT_FILE } : {}),
                    ...(process.env.SSL_CERT_DIR ? { SSL_CERT_DIR: process.env.SSL_CERT_DIR } : {}),
                },
            },
        );

        const repoName = path.basename(uri.pathname, '.git');
        const orgName = path.relative('/', path.dirname(uri.pathname));
        const destRoot = path.resolve(cacheDir, repoName, orgName);
        if (destRoot !== cacheDir && !isInside(cacheDir, destRoot)) {
            throw new Error(`external repo path escapes cache dir: ${redact(uri)}`);
        }

        fs.mkdirSync(destRoot, { recursive: true });
        for (const s of subpath) {
            const src = path.resolve(cloneDir, s);
            const dest = path.resolve(destRoot, s);
            if (!isInside(cloneDir, src) || !isInside(destRoot, dest)) {
                throw new Error(`external path escapes repository: ${s}`);
            }
            // never copy symlinks (defense in depth if core.symlinks is overridden)
            fs.cpSync(src, dest, { recursive: true, filter: (p) => !fs.lstatSync(p).isSymbolicLink() });
        }
    } catch (e) {
        // execFileSync errors embed the full command line and git stderr, both of which
        // can contain URL credentials. Log and rethrow a scrubbed error only.
        const scrub = (s: string) => s.replaceAll(/\/\/[^/@\s]+@/g, '//');
        const stderr = (e as { stderr?: Buffer }).stderr;
        if (stderr) {
            logger.error(scrub(stderr.toString()));
        }
        throw new Error(scrub(e instanceof Error ? e.message : String(e)));
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

export function collectAllExternal(cfg: Config): string[] {
    // get the configuration for the external references

    const rc = cfg.rulesConfig;
    const repoList: { [key: string]: string[] } = {};

    if ('external-tasks' in rc && Array.isArray(rc['external-tasks'])) {
        logger.info('located external-tasks in tool config');
        const externals = rc['external-tasks'];
        externals.forEach((e: ExternalResource) => {
            logger.info(sanitizeForLogging(e));
            if (!(e.uri in repoList)) {
                repoList[e.uri] = [];
            }
            if (e.path) {
                repoList[e.uri].push(e.path);
            }
        });

        logger.info(sanitizeForLogging(repoList));

        const matchedGlobs: string[] = [];
        const cacheDir = path.resolve(cfg.cache_dir);

        for (const [key, value] of Object.entries(repoList)) {
            getExternal(key, value, cfg);
            const uri = new URL(key);
            const repoName = path.basename(uri.pathname, '.git');
            const orgName = path.relative('/', path.dirname(uri.pathname));
            const destRoot = path.resolve(cacheDir, repoName, orgName);
            for (const s of value) {
                const target = path.resolve(destRoot, s);
                if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
                    matchedGlobs.push(path.join(target, '**/*.yaml'), path.join(target, '**/*.yml'));
                } else {
                    matchedGlobs.push(target);
                }
            }
        }
        return matchedGlobs;
    }

    return [];
}
