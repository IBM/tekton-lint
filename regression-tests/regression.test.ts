import fs from 'node:fs'

import fg from 'fast-glob';
import {getDefaultConfig,linter} from '../src/index'

const pattern = "./regression-tests/general/*.yaml"
const yamlfiles = fg.globSync(pattern)


describe("Regression Tests",()=>{

    test.each(yamlfiles)("%s",async (yamlSrcPath)=>{                                             
        const cfg = getDefaultConfig()

        const problems = await linter(cfg,[yamlSrcPath])
        const expectedPath =`${yamlSrcPath}.expect.json`

        if (!fs.existsSync(expectedPath)){
          fs.writeFileSync(expectedPath, JSON.stringify(problems))
        }

        const expected = JSON.parse(fs.readFileSync(expectedPath,'utf-8'))
        expect(problems).toMatchObject(expected)      
    })

})