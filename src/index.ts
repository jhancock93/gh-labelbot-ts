import { Application, Context } from 'probot' // eslint-disable-line no-unused-vars
import { BotConfig } from './BotConfig'
import { Label } from './label'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import nock from 'nock'

import { RepositoryLabels } from './repositoryLabels'

const configFilename: string = 'labelbot.yml'
const configPath: string = `.github/${configFilename}`

export = (app: Application) => {
  app.on(
    [
      'pull_request.opened',
      'pull_request.reopened',
      'pull_request.synchronize',
      'push'
    ],
    async (context) => {
      if (context.event === 'push') {
        await checkForSettingsChanges(context)
      } else {
        await autolabelCheck(context)
      }
    }
  )

  // Called on push events to check if the probot's configuration file was updated in the default branch
  // If so, it will try to add/update any labels that were defined as part of the .yml
  // For safety reasons, this does not attempt to delete any labels
  async function checkForSettingsChanges (context: Context): Promise<void> {
    context.log.debug(`syncLabels: received ${context.event} event`)
    const payload = context.payload
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const isDefaultBranch = payload.ref === `refs/heads/${payload.repository.default_branch}`
    if (isDefaultBranch) {
      const settingsModified = payload.commits.find((commit: { added: string[], modified: string[] }) => {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        return commit.added.includes(configPath) || commit.modified.includes(configPath)
      }) !== undefined
      if (settingsModified) {
        await syncRepoLabels(context)
      }
    }
  }

  async function syncRepoLabels (context: Context): Promise<void> {
    // nock.recorder.rec()
    const config: any = await context.config(configFilename)
    const desiredLabels = RepositoryLabels.readLabelDefinitionsFromConfig(config)
    context.log.info(`Read ${desiredLabels.length} from config file: ${desiredLabels.map(l => l.name).join(', ')}`)
    if (desiredLabels.length > 0) {
      var repo = context.repo()
      var labels = new RepositoryLabels(context.github, repo.owner, repo.repo, context.log)
      await labels.syncLabels(desiredLabels)
    }
  }

  async function autolabelCheck (context: Context): Promise<void> {
    context.log.debug(`autolabelCheck: received ${context.event} event`)
    const label = await forRepository(context)
    await label.apply(context)
  }

  async function forRepository (context: Context): Promise<Label> {
    context.log.debug('Checking configuration...')

    let config: any = {}
    try {
      context.log.trace('Calling getConfig')
      config = await context.config(configFilename)
      context.log.debug(`Retrieved config: ${config}`)
    } catch (Error) {
      context.log.warn(`Failed to retrieve configuration using getConfig with error ${Error} using empty configuration...`)
    }
    // Supply docs label
    if (config == null) {
      config = {}
    }
    const botConfig = new BotConfig(config)
    return new Label(context.github, botConfig, app.log)
  }

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
