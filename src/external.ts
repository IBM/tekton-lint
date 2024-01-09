import child_process from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// import stream from 'node:stream';
import { logger } from './logger.js';
import { Config } from './config.js';

import { ExternalResource } from './interfaces/common.js';

const appPrefix = 'tektonlint';

export function getExternal(repo: string, subpath: string[], cfg: Config) {
    const cacheDir = cfg.cache_dir;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));

    const r = child_process.execSync(`git clone ${repo} ${tmpDir}`, { stdio: ['ignore', 'pipe', 'ignore'] });
    logger.info(r.toString());

    const uri = new URL(repo);

    const repoName = path.basename(uri.pathname, '.git');
    const orgName = path.relative('/', path.dirname(uri.pathname));

    fs.mkdirSync(path.join(cacheDir, repoName, orgName), { recursive: true });
    subpath.forEach((s) => {
        const src = path.join(tmpDir, s);
        const dest = path.join(cacheDir, repoName, orgName, s);
        fs.cpSync(src, dest, { recursive: true });
    });
}

export function collectAllExternal(cfg: Config): string[] {
    // get the configuration for the external references

    const rc = cfg.rulesConfig;
    const repoList: { [key: string]: string[] } = {};

    if ('external-tasks' in rc) {
        logger.info('located external-tasks in tool config');
        const externals = rc['external-tasks'];
        externals.forEach((e: ExternalResource) => {
            logger.info(e);
            if (!(e.uri in repoList)) {
                repoList[e.uri] = [];
            }
            repoList[e.uri].push(e.path!);
        });

        logger.info(repoList);

        for (const [key, value] of Object.entries(repoList)) {
            getExternal(key, value, cfg);
        }
        return [`${cfg.cache_dir}/**/*.yaml`];
    }

    return [];
}
