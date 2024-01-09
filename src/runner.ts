import { Config } from './config.js';
import Reporter from './reporter.js';
import { lint as doLint } from './rules.js';

import glob from 'fast-glob';
import yaml from 'yaml';
import fs from 'node:fs';
import { collectAllExternal } from './external.js';
import { logger } from './logger.js';
import { Doc } from './interfaces/common.js';

/* Collect paths based on the glob pattern passed in  */
const collector = async (paths: string[], cfg: Config) => {
    const docs: Doc[] = [];
    const files = await glob(paths);
    logger.info('Found these files %j', files);
    for (const file of files) {
        const content = await fs.promises.readFile(file, 'utf8');

        for (const doc of yaml.parseAllDocuments(content)) {
            docs.push({
                content: doc.toJSON(),
                doc,
                path: file,
                raw: content,
                no_report: file.startsWith(cfg.cache_dir),
            });
        }
    }

    return docs;
};

export default async function runner(cfg: Config) {
    // setup the cache of the external tasks
    const external_cached = collectAllExternal(cfg);

    // get all the documents, including the external ones cached locally
    const docs = await collector([...cfg.globs, ...external_cached], cfg);
    if (docs && docs.length > 0) {
        const reporter = new Reporter(docs);

        return doLint(
            docs.map((doc: any) => doc.content),
            reporter,
            cfg.rulesConfig,
        );
    } else {
        throw new Error(`No paths match glob "${cfg.globs}" - did you mean to add "*.yaml"`);
    }
}
