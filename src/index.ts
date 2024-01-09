import { Config } from './config.js';

import run from './runner.js';
import { Problem, Location } from './interfaces/common.js';

class Linter {
    public static async run(cfg: Config): Promise<Problem[]> {
        const problems = await run(cfg);
        return problems;
    }
}

export { Problem, Location, Config, Linter };
