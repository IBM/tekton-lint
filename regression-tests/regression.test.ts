import fs from 'node:fs'
import fg from 'fast-glob';
import path from 'node:path';
import {Problem, Config, Linter} from '../src/index'

const pattern = "./regression-tests/general/*.yaml"
const yamlfiles = fg.globSync(pattern)
const customconfig = "./regression-tests/customconfig/*.yaml"

describe("Default Config Regression Tests",()=>{

    test.each(yamlfiles)("%s",async (yamlSrcPath)=>{                                                    
        const cfg: Config = Config.getDefaultConfig()
        cfg.globs=[yamlSrcPath]
        const problems: Problem[] = await Linter.run(cfg)

        const expectedPath =`${yamlSrcPath}.expect.json`

        if (!fs.existsSync(expectedPath)){
          fs.writeFileSync(expectedPath, JSON.stringify(problems))
        }

        const expected = JSON.parse(fs.readFileSync(expectedPath,'utf-8'))
        expect(problems).toMatchObject(expected)      
    })

})

describe("Custom Config Regression Tests",()=>{

  test.each(fg.globSync(customconfig))("%s", async (yamlSrcPath)=>{
    const cfgPath = path.resolve(path.dirname(yamlSrcPath))
    const cfg: Config = Config.getConfig(cfgPath);
    cfg.globs=[yamlSrcPath]
    const problems: Problem[] = await Linter.run(cfg)

    const expectedPath =`${yamlSrcPath}.expect.json`

    if (!fs.existsSync(expectedPath)){
      fs.writeFileSync(expectedPath, JSON.stringify(problems))
    }

    const expected = JSON.parse(fs.readFileSync(expectedPath,'utf-8'))
    expect(problems).toMatchObject(expected)  

  })

})