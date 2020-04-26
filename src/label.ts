import { Context, GitHubAPI } from 'probot' // eslint-disable-line no-unused-vars
import { BotConfig } from './BotConfig'
import { LoggerWithTarget } from 'probot/lib/wrap-logger'

import ignore from 'ignore'
import { matchPattern } from './matchPattern'

export class Label {
  github: GitHubAPI
  logger: LoggerWithTarget
  config: BotConfig

  constructor (github: GitHubAPI, config: BotConfig, logger: LoggerWithTarget) {
    this.github = github
    this.logger = logger
    this.config = config

    this.logger.debug('Configuration:' + JSON.stringify(config))
  }

  static applyBranchLabels (branch: string, config: Map<string, string>, labels: Set<string>): void {
    for (const key of config.keys()) {
      const value = config.get(key)
      if (value != null) {
        if (matchPattern(value, branch) !== false) {
          labels.add(key)
        }
      }
    }
  }

  // generate a set of labels based on the context and the files changed in the pull request
  static generatePullRequestLabels (pullRequest: any, config: BotConfig, changedFiles: string[], logger: LoggerWithTarget): string[] {
    const labels = new Set<string>()

    const pullNumber: number = pullRequest.number
    const targetBranch: string = pullRequest.base.ref
    logger.debug(`Target (base) branch for PR #${pullNumber} is "${targetBranch}"`)
    this.applyBranchLabels(targetBranch, config.targetBranchLabels, labels)

    const sourceBranch: string = pullRequest.head.ref
    logger.debug(`Source (head) branch for PR #${pullNumber} is "${sourceBranch}"`)
    this.applyBranchLabels(sourceBranch, config.sourceBranchLabels, labels)

    if (changedFiles != null && changedFiles.length > 0) {
      config.pathLabels?.forEach((value: string[], key: string) => {
        logger.info('Examining file changes for label', key, value)
        const matcher = ignore().add(value)

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (changedFiles.find(file => matcher.ignores(file))) {
          labels.add(key)
        }
      })
    }

    return Array.from(labels)
  }

  // Applies labels to a pull request based on the pull request details in the context and the configuration
  async apply (context: Context): Promise<Boolean> {
    const { title, html_url: htmlUrl }: { title: string, html_url: string } = context.payload.pull_request
    const pullNumber: number = context.payload.pull_request.number

    this.logger.info(`Processing PR #${pullNumber} "${title}" ( ${htmlUrl} )`)
    this.logger.debug(`Pulling files for PR ${pullNumber}`)
    const files = await context.github.pulls.listFiles(context.repo({ pull_number: pullNumber }))
    const changedFiles = files.data.map(file => file.filename)

    const labelsToAdd = Label.generatePullRequestLabels(context.payload.pull_request,
      this.config, changedFiles, this.logger)

    this.logger.info('Adding labels', labelsToAdd)
    if (labelsToAdd.length > 0) {
      try {
        await context.github.issues.addLabels(context.repo({ labels: labelsToAdd, issue_number: pullNumber }))
        return true
      } catch {
        return false
      }
    }
    return false
  }
}
