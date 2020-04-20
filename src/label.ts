import { Context, GitHubAPI } from 'probot' // eslint-disable-line no-unused-vars
import { BotConfig } from './BotConfig'
import { LoggerWithTarget } from 'probot/lib/wrap-logger'

import ignore from 'ignore';
import { matchPattern } from './matchPattern'

export class Label {
  github: GitHubAPI
  logger: LoggerWithTarget
  config: BotConfig

  constructor(github: GitHubAPI, config: BotConfig, logger: LoggerWithTarget) {
    this.github = github
    this.logger = logger
    this.config = config;

    this.logger.debug('Configuration:' + JSON.stringify(config))
  }

  applyBranchLabels(branch: string, config: Map<string, string>, labels: Set<string>): void {
    for (let key of config.keys()) {
      const value = config.get(key)
      if (value) {
        this.logger.debug(`Testing if branch ${branch} matches pattern ${value}`)
        if (matchPattern(value, branch)) {
          labels.add(key)
        }
      }
    }
  }

  async apply(context: Context): Promise<Boolean> {
    const { title, html_url: htmlUrl } = context.payload.pull_request

    this.logger.info(`Processing PR "${title}" ( ${htmlUrl} )`)

    const labels = new Set<string>()
    if (this.config.label) {
      if (!context.payload.repository.private) {
        this.logger.info(`Updating PR with static label from config "${title}" ( ${htmlUrl} ): "${this.config.label}"`)
      }
      labels.add(this.config.label)
    }


    const targetBranch = context.payload.pull_request.base.ref
    this.logger.debug(`Target (base) branch for PR is "${targetBranch}"`)
    if (this.config.targetBranchLabels) {
      this.applyBranchLabels(targetBranch, this.config.targetBranchLabels, labels)
    }

    const sourceBranch = context.payload.pull_request.head.ref
    this.logger.debug(`Source (head) branch for PR is "${sourceBranch}"`)
    if (this.config.sourceBranchLabels) {
      this.applyBranchLabels(sourceBranch, this.config.sourceBranchLabels, labels)
    }

    const pullNumber = context.payload.pull_request.number;
    this.logger.debug(`Pulling files for PR ${pullNumber}`)
    const files = await context.github.pulls.listFiles(context.repo({ pull_number: pullNumber }))
    const changedFiles = files.data.map(file => file.filename)
    if (changedFiles && changedFiles.length > 0) {
      this.config.pathLabels?.forEach((value: string[], key: string) => {
        this.logger.info('Examining file changes for label', key, value)
        const matcher = ignore().add(value)

        if (changedFiles.find(file => matcher.ignores(file))) {
          labels.add(key)
        }
      })
    }

    const labelsToAdd = Array.from(labels)

    this.logger.info('Adding labels', labelsToAdd)
    if (labelsToAdd.length > 0) {
      try {
        await context.github.issues.addLabels(context.repo({ labels: labelsToAdd, issue_number: pullNumber }))
        return true
      }
      catch {
        return false
      }
    }
    return false
  }
}
