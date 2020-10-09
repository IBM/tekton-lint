import chokidar from 'chokidar';
import run from './runner';
import { logProblems } from './utils';

const runLinter = async (cause, paths) => {
  console.log(cause);
  const problems = await run(paths);
  logProblems(problems);
  console.log('Tekton-lint finished running!');
};

export default (paths) => {
  const watcher = chokidar.watch(paths, {
    persistent: true,
  });

  watcher
    .on('ready', () => {
      runLinter(`Tekton Linter started in watch mode!`, paths)
        .catch((error) => {
          console.error(error);
          process.exitCode = 1;
          watcher.close();
        });
    })
    .on('change', (path) => {
      runLinter(`File ${path} has been changed! Running Linter again!`, paths)
        .catch((error) => {
          console.error(error);
          process.exitCode = 1;
          watcher.close();
        });
    })
    .on('unlink', (path) => {
      runLinter(`File ${path} has been removed! Running Linter again!`, paths)
        .catch((error) => {
          console.error(error);
          process.exitCode = 1;
          watcher.close();
        });
    });
};
