## IDE Integration

> note this is hasn't been extensively tested; a better VSCode plugin would be preferred should time permit

`tekton-lint` can be added as a [Task][vscode-task]:

```js
// .vscode/tasks.json

{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run tekton-lint in the workspace",
      "type": "shell",
      "command": "tekton-lint",
      "args": [
        "--watch",
        "--format","vscode",
        "--config","${workspaceFolder}/.vscode/.tektonlintrc.yaml",  // if needed, otherwise remove this line
        "${workspaceFolder}/**/*.yaml" // Change this path to the path of your yaml files (this will watch for every yaml file in your currently open workspace)
      ],
      "problemMatcher": [
        {
          "fileLocation": "absolute",
          "pattern": [
            {
              "regexp": "^([^\\s].*):$",
              "file": 1
            },
            {
              "regexp": "^(error|warning|info)\\s+\\((\\d+,\\d+,\\d+,\\d+)\\):(.*)$",
              "severity": 1,
              "location": 2,
              "message": 3,
              "loop": true
            }
          ],
          "background": {
            "activeOnStart": true,
            "beginsPattern": "^File (.*) has been changed! Running Linter again!",
            "endsPattern": "^Tekton-lint finished running!"
          }
        }
      ]
    }
  ]
}
```

You can run this task from _Terminal_ > _Run Task..._ > _Run tekton-lint_:

![vscode-screenshot]

