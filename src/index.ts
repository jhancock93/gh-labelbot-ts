import { Application, Context } from 'probot' // eslint-disable-line no-unused-vars
import getConfig from 'probot-config'
import { BotConfig } from './BotConfig'
import { Label } from './label'

export = (app: Application) => {
  app.on(
    [
      'pull_request.opened',
      'pull_request.reopened',
      'pull_request.synchronize'
    ],
    async (context) => {
      autolabelCheck(context)
    })

  async function autolabelCheck(context: Context) {
    context.log.debug('Received event')
    const label = await forRepository(context)
    label.apply(context)
  }

  async function forRepository(context: Context) {
    context.log.debug('Checking configuration...')
    let config = await getConfig(context, 'labelbot.yml')

    if (!config) {
      context.log.debug('Empty configuration found, using defaults...')
      config = {
        targetBranchLabels: { release: 'release-.*' },
        pathLabels: {
          docs: ['*.md', 'docs/*']
        }
      }
    }

    const { owner, repo } = context.repo()
    const botConfig = new BotConfig(config, owner, repo)
    return new Label(context.github, botConfig, app.log)
  }
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
