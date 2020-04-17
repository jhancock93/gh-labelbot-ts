import { Context, GitHubAPI } from 'probot' // eslint-disable-line no-unused-vars
import { BotConfig } from './BotConfig'
import { LoggerWithTarget } from 'probot/lib/wrap-logger';

const ignore = require('ignore')
const matchPattern = require('./matchPattern')
/*
const http = require('http')
const originalRequest = http.request

http.request = function wrapMethodRequest(req) {
  console.log(req.host, req.body)
  return originalRequest.apply(this, arguments)
}
*/

export class Label {
  github: GitHubAPI
  logger: LoggerWithTarget
  config: BotConfig
  owner: string
  repo: string

  constructor(github: GitHubAPI, config: BotConfig, logger: LoggerWithTarget) {
    this.github = github
    this.logger = logger
    this.config = config;
    this.owner = config.owner!;
    this.repo = config.repo!;

    this.logger.debug('Configuration:' + JSON.stringify(config))
  }

  async apply(context: Context) {
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
    this.logger.debug(`Target branch for PR is "${targetBranch}"`)
    if (this.config.targetBranchLabels) {
      this.config.targetBranchLabels.forEach((value: string, key: string) => {
        this.logger.debug(`Testing if branch ${targetBranch} matches pattern ${value}`)
        if (matchPattern(value, targetBranch)) {
          labels.add(key)
        }
      })
    }

    const pull_number = context.payload.pull_number;
    this.logger.debug(`Pulling files for PR ${context.payload.pull_request.number}`)
    const files = await context.github.pulls.listFiles(context.repo({ pull_number: context.payload.pull_request.number }))
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
      return context.github.issues.addLabels({ labels: labelsToAdd, repo: this.repo, owner: this.owner, number: pull_number })
    }
    return
  }
}
