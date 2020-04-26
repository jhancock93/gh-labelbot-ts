import nock from 'nock'
// import nockBack from 'nock'

// Requiring our app implementation
import myProbotApp from '../src'
import { BotConfig } from '../src/BotConfig'
import { Probot /*, GitHubAPI, Context*/ } from 'probot'
import { wrapLogger } from 'probot/lib/wrap-logger'
import { logger } from 'probot/lib/logger'
import { generateContentJson } from './generateContentFromFile'
import debug from 'debug'

const fs = require('fs')
import { readFileSync } from 'fs'
const validConfigFile = readFileSync('./test/fixtures/validConfiguration.yml', 'utf-8');

import path from 'path'
import * as pullRequest1 from './fixtures/pull_request_master.opened.json'
import * as pullRequestTargetRelease from './fixtures/pull_request_targetBranch.opened.json'
import { Label } from '../src/label'
import { RepositoryLabels, ILabelDefinition } from '../src/repositoryLabels'

const defaultConfig = {
  labelDefinitions: [
    {name: 'hotfix', color: 'FF0000', description: 'A bug'},
    {name: 'release', color: '1111DD', description: 'Targets release branch'},
    {name: 'foobar', color: 77}
  ],
  sourceBranchLabels: { hotfix: 'hotfix-.*', bug: 'bugfix-.*' },
  targetBranchLabels: { release: 'release-.*', trunk: '(master|develop)' },
  pathLabels: {
    docs: ['*.md', 'docs/*'],
    config: ['*.yml']
  }
}
const defaultBotConfig = new BotConfig(defaultConfig)
const traceLogger = wrapLogger(logger)

describe('validate config parsing and loading', () => {
  test('construct BotConfig from valid schema 1', () => {
    const config = new BotConfig({ pathLabels: { frontend: ['*.js'], docs: ['*.md', '*.txt'] } })
    expect(config.pathLabels.size).toBe(2)
    expect(config.pathLabels.get('docs')!.length).toBe(2)
  })

  test('construct BotConfig from valid schema 2', () => {
    const config = new BotConfig(
      {
        targetBranchLabels: { release: 'release-.*', trunk: '(master|develop)' }
      })
    expect(config.targetBranchLabels.size).toBe(2)
  })

  test('construct BotConfig from invalid schema', () => {
    new BotConfig(
      {
        foo: 'blah'
      }
    )
  })
})

describe ('validate proper labels are generated', () => {
  test ('tests that a docs label is generated on markdown change', () => {
    const labels = Label.generatePullRequestLabels(pullRequestTargetRelease.pull_request, defaultBotConfig,
      ["src/README.md"], traceLogger)
    expect(labels).toEqual(expect.arrayContaining(['docs', 'release']))
  })
  test ('tests that multiple labels are generated for different cases', () => {
    const pullRequestData = {
      url: "fakeUrl",
      html_url: "fakeHtml",
      number: 1,
      head: {
        ref: "bugfix-pt-12345"
      },
      repo: {
        name: "probot-test",
        owner: {
          login: "testUser"
        }
      },
      base: {
        ref: "master"
      }
    }
    const labels = Label.generatePullRequestLabels(
      pullRequestData, defaultBotConfig,
      ["src/README.md", "config.yml"], traceLogger)
    expect(labels).toEqual(expect.arrayContaining(['docs', 'config', 'trunk', 'bug']))
  })
})

describe ('label changes are properly detected', () => 
{
  test ('label definitions are created from input properly', () => {
    const labelDefs = RepositoryLabels.readLabelDefinitionsFromConfig(defaultConfig)
    expect(labelDefs[0].name).toEqual('hotfix')
    expect(labelDefs[0].description).toEqual('A bug')
    expect(labelDefs[2].name).toEqual('foobar')
    expect(labelDefs[2].color).toEqual('000077')
  })

  test ('label definition updates are generated correctly', () => {
    const currentLabels = RepositoryLabels.readLabelDefinitionsFromConfig(defaultConfig)
    const desiredLabels: ILabelDefinition[] = []
    //clone current labels to desired
    currentLabels.forEach(val => desiredLabels.push(Object.assign({}, val)))

    // modify one label
    desiredLabels[1].color = 'FFFFFF'
    desiredLabels[1].description = 'New desc'

    // create another label
    desiredLabels.push({name: 'newlabel', color: '112233', description: ''})

    // check that the update logic generates a single update and a single add
    var labelActions = RepositoryLabels.generateUpdates(currentLabels, desiredLabels)
    expect(labelActions.labelsToAdd.length).toEqual(1)
    expect(labelActions.labelsToAdd[0].name).toEqual('newlabel')
    expect(labelActions.labelsToAdd[0].color).toEqual('112233')
    expect(labelActions.labelsToUpdate.length).toEqual(1)
    expect(labelActions.labelsToUpdate[0].name).toEqual(desiredLabels[1].name)
    expect(labelActions.labelsToUpdate[0].color).toEqual('FFFFFF')
    expect(labelActions.labelsToUpdate[0].description).toEqual('New desc')
  })
})

/*
function doNockGetAccessToken() {
  // Test that we correctly return a test token. Doesn't seem to be needed right now
  nock('https://api.github.com')
    // .log(console.log)
    .post('/app/installations/7981746/access_tokens') //60924
    .reply(200, { token: 'test' })
}
*/

function doNockConfigRequests() {
  // bot will try to read config file from repo
  nock('https://api.github.com:443', { "encodedQueryParams": true })
    .get('/repos/jhancock93/probot-test/contents/.github/labelbot.yml')
    .reply(200, generateContentJson('labelbot.yml', 'labelbot.yml', validConfigFile))

  /*
  // No need to access the .github repo if we can retrieve contents from the main repo
nock('https://api.github.com')
  .get('/repos/jhancock93/.github/contents/.github/labelbot.yml')
  .reply(404)
  */
}


describe ('My Probot app', () => {
  let probot: any
  // let event: Webhooks.WebhookEvent<any>
  let mockCert: string
  // let context: Context
  // let github: GitHubAPI

  beforeAll ((done: Function) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err: Error, cert: string) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

  beforeEach (() => {
    debug.enable('nock*')
    /*
    github = GitHubAPI()
    event = {
      id: '123',
      name: 'pull_request',
      payload: {
        pull_request: { number: 1 },
        repository: {
          name: 'probot-test',
          owner: { login: 'jhancock93' }
        }
      }
    }
    context = new Context(event, github, {} as any)
    */

    nock.disableNetConnect()
    probot = new Probot({ id: 123, cert: mockCert, githubToken: 'test' })
    // Load our app into probot
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = () => 'test'
  })

  // files that include a markdown file
  const prFilesMarkdown = require('./fixtures/prFiles-markdown.json')

  jest.setTimeout(30000);

  test ('tests that a label is added based on markdown change', async () => {
    // doNockGetAccessToken()
    doNockConfigRequests()

    nock('https://api.github.com')
      .get('/repos/jhancock93/probot-test/pulls/1/files')
      .reply(200, prFilesMarkdown.data)

    // Test that a label is applied
    nock('https://api.guthub.com:443', { "encodedQueryParams": true })
      .log(console.log)
      .post('/repos/jhancock93/probot-test/issues/1/labels', ["docs"])
      .reply(200)

    const eventWithPayload = { name: 'pull_request', payload: pullRequest1 }
    await probot.receive(eventWithPayload);
    console.error('pending mocks: %j', nock.pendingMocks())
    expect(nock.isDone()).toBe(true)
  })
})

afterEach(() => {
  debug.disable()
  nock.cleanAll()
  nock.enableNetConnect()
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock
