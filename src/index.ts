import { Application, Context } from 'probot' // eslint-disable-line no-unused-vars
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
      await autolabelCheck(context)
    })

  async function autolabelCheck (context: Context): Promise<void> {
    context.log.debug('Received event')
    const label = await forRepository(context)
    await label.apply(context)
  }

  async function forRepository (context: Context): Promise<Label> {
    context.log.debug('Checking configuration...')

    let config: any
    try {
      context.log.trace('Calling getConfig')
      config = await context.config('labelbot.yml')
      context.log.debug(`Retrieved config: ${config}`)
    } catch (Error) {
      context.log.warn(`Failed to retrieve configuration using getConfig with error ${Error} using defaults...`)
      config = {
        targetBranchLabels: { release: 'release-.*' },
        pathLabels: {
          docs: ['*.md', 'docs/*']
        }
      }
    } finally {
      context.log.debug('forRepository finally')
    }
    const botConfig = new BotConfig(config)
    return new Label(context.github, botConfig, app.log)
  }

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
