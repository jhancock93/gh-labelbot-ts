# gh-label-bot-ts

> A GitHub App built with [Probot](https://github.com/probot/probot) that A PR labeler GitHub App built with Probot.

## Configuration

Operation of the GitHub app depends on the presence of a configuration file named `labelbot.yml`. It must be located in the `.github` directory of the repository. If the file does not exist in the repository, it will also look in the organizations' .github repo.

The configuration file provides multiple methodologies for auto-labeling. Labels can be applied based off of the target (base) branch name, the source (head) branch name, and/or the set of files modified in the PR.

The format of the file is as following:
```yml
sourceBranchLabels:
    labelA: RegEx
    labelB: RegEx
targetBranchLabels:
    labelC: RegEx
    ...
pathLabels:
    labelD: [filepattern1, filepattern2]
    labelE: [filepattern3, filepattern4]
```

For example:
```yml
sourceBranchLabels: 
    hotfix: 'hotfix-.*'
    bug: 'bugfix-.*'
targetBranchLabels: 
    release: 'release-.*'
    trunk: '(master|develop)'
pathLabels:
    docs: ['*.md', 'docs/*'],
    config: ['*.yml']
```
The above configuration woul:
* apply a `hotfix` label to any PR coming from a branch name starting with `hotfix-`
* apply a `bugfix` label to any PR coming from a branch name starting with `bugfix-`
* apply a `release` label to any PR being merged to a branch starting with `release-`
* apply a `trunk` branch to any PR to develop or master branches
* apply a `docs` label if the PR touches a markdown file or any file in the docs directory
* apply a `config` label if the PR touches any yml file

## Setup
```

```sh
# Install dependencies
npm install

# Run with hot reload
npm run build:watch

# Compile and run
npm run build
npm run start
```

## Contributing

If you have suggestions for how gh-label-bot-ts could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2020 John Hancock <jhancock93@users.noreply.github.com>
