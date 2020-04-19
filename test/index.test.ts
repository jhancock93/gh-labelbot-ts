// You can import your modules
// import index from '../src/index'

import nock from 'nock'
// Requiring our app implementation
import myProbotApp from '../src'
import { BotConfig } from '../src/BotConfig'
import { Probot /*, GitHubAPI, Context*/ } from 'probot'
// import Webhooks from '@octokit/webhooks'
// import { createMockResponse } from './fixtures/octokit/mock-response'

const fs = require('fs')
import path from 'path'
import * as pullRequest1 from './fixtures/pull_request_master.opened.json'

/*
const defaultTestConfig = {
  targetBranchLabels: { release: 'release-.*' },
  pathLabels: {
    docs: ['*.md', 'docs/*']
  }
}
*/

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


function doNockGetAccessToken() {
  // Test that we correctly return a test token. Doesn't seem to be needed right now
  nock('https://api.github.com')
    .log(console.log)
    .post('/app/installations/7981746/access_tokens') //60924
    .reply(200, { token: 'test' })
}

function doNockConfigRequests() {

  //bot will try to call installations API
  /*
  nock('https://api.github.com')
    .log(console.log)
    .get('/installation/repositories/')
    .reply(200)
*/

  // bot will try to read config file from repo
  nock('https://api.github.com')
    .log(console.log)
    .get('/repos/jhancock93/probot-test/contents/.github/labelbot.yml')
    .reply(404)
    .get('/repos/jhancock93/.github/contents/.github/labelbot.yml')
    .reply(404)
  // .reply(200, validConfig)
}


describe('My Probot app', () => {
  let probot: any
  // let event: Webhooks.WebhookEvent<any>
  let mockCert: string
  // let context: Context
  // let github: GitHubAPI

  /*
  function contentsFromString(content: string) {
    return createMockResponse({
      content: Buffer.from(content).toString('base64')
    }) as ReturnType<typeof GitHubAPI.repos.getContents>
  }
  */
  beforeAll((done: Function) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err: Error, cert: string) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

  beforeEach(() => {
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

  test('tests that a label is added based on markdown change', async () => {
    //jest.spyOn(context, 'config').mockReturnValue(defaultTestConfig)
    doNockGetAccessToken()
    doNockConfigRequests()

    nock('https://api.github.com')
      .log(console.log)
      .get('/repos/jhancock93/probot-test/pulls/1/files')
      .reply(200, prFilesMarkdown.data)

    // Test that a label is applied
    nock('https://api.guthub.com')
      .log(console.log)
      .patch('/repos/jhancock93/probot-test/issues/1', (body) => {
        expect(body).toMatchObject({ labels: ['docs'] })
        return true
      })
      .reply(200)

    const eventWithPayload = { name: 'pull_request', payload: pullRequest1 }
    await probot.receive(eventWithPayload);
    console.error('pending mocks: %j', nock.pendingMocks())
    //expect(nock.isDone()).toBe(true)
  })


  /*
    test('tests that a label is added based on target branch', async () => {
      const pullRequestReleaseBranch = require('./fixtures/pull_request_targetBranch.opened.json')
      const prFilesOther = require('./fixtures/prFiles-other.json')
   
      // doNockGetAccessToken()
      doNockConfigRequests()
   
      nock('https://api.github.com')
        .log(console.log)
        .get('/repos/jhancock93/probot-test/pulls/2/files')
        .reply(200, prFilesOther.data)
   
      // Test that a branch-based label is applied
      nock('https://api.guthub.com')
        .log(console.log)
        .patch('/repos/jhancock93/probot-test/issues/2', (body) => {
          expect(body).toMatchObject({ labels: ['release'] })
          return true
        })
        .reply(200)
   
      await probot.receive({ name: 'pull_request', payload: pullRequestReleaseBranch })
      console.error('pending mocks: %j', nock.pendingMocks())
      expect(nock.isDone()).toBe(true)
    })
  */

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock
