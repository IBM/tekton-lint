import chokidar from 'chokidar';
import { Config } from './config.js';
import run from './runner.js';
import logProblems from './log-problems.js';
import { logger } from './logger.js';

/**
 * Lints once, then again whenever a file matching the configured globs is added, changed or removed.
 * Runs are serialised; changes that arrive during a run trigger a single follow-up run.
 * A failed run is logged and the watcher keeps going, so a half-edited file does not end the session.
 */
export default function watch(cfg: Config) {
    const watcher = chokidar.watch(cfg.globs, { persistent: true, ignoreInitial: true });

    let running = false;
    let pending: string | undefined;

    const runLinter = async (cause: string) => {
        if (running) {
            pending = cause;
            return;
        }
        running = true;
        try {
            console.log(cause);
            logProblems(cfg, await run(cfg));
            console.log('Tekton-lint finished running!');
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
        } finally {
            running = false;
        }
        if (pending) {
            const next = pending;
            pending = undefined;
            await runLinter(next);
        }
    };

    watcher
        .on('ready', () => void runLinter('Tekton Linter started in watch mode!'))
        .on('add', (file) => void runLinter(`File ${file} has been added! Running Linter again!`))
        .on('change', (file) => void runLinter(`File ${file} has been changed! Running Linter again!`))
        .on('unlink', (file) => void runLinter(`File ${file} has been removed! Running Linter again!`));

    return watcher;
}
