// You can import your modules
// import index from '../src/index'

import nock from 'nock'
// Requiring our app implementation
import myProbotApp from '../src'
import { BotConfig } from '../src/BotConfig'
import { Probot } from 'probot'
// Requiring our fixtures

const fs = require('fs')
import path from 'path'
const pullRequest1 = import('./fixtures/pull_request_master.opened.json')


describe('validate config parsing and loading', () => {
  test('construct BotConfig from valid schema 1', () => {
    new BotConfig({ pathLabels: { frontend: ['*.js'], docs: ['*.md', '*.txt'] } })
  })

  test('construct BotConfig from valid schema 2', () => {
    new BotConfig(
      {
        targetBranchLabels: { release: 'release-.*', trunk: '(master|develop)' }
      })
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
  /*
  nock('https://api.github.com')
    .log(console.log)
    .post('/app/installations/60924/access_tokens')
    .reply(200, { token: 'test' })
    */
}

function doNockConfigRequests() {
  //bot will try to call installations API
  nock('https://api.github.com')
    .log(console.log)
    .get('/installation/repositories*')
    .reply(200)

  // bot will try to read config file from repo
  nock('https://api.github.com')
    .get('/repos/jhancock93/probot-test/contents/.github/labelbot.yml')
    .reply(404)
  // .reply(200, validConfig)

  // next, bot will try .github repo for .github/labelbot.yml
  nock('https://api.github.com')
    .get('/repos/jhancock93/.github/contents/.github/labelbot.yml')
    .reply(404)
}


describe('My Probot app', () => {
  let probot: any
  let mockCert: string

  beforeAll((done: Function) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err: Error, cert: string) => {
      if (err) return done(err)
      mockCert = cert
      done()
    })
  })

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({ id: 123, cert: mockCert, githubToken: 'test' })
    // Load our app into probot
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = () => 'test'
  })

  /*
  test('creates a comment when an issue is opened', async (done) => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
 
    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', (body: any) => {
        done(expect(body).toMatchObject(issueCreatedBody))
        return true
      })
      .reply(200)
 
    // Receive a webhook event
    await probot.receive({ name: 'issues', payload })
  })
*/

  test('tests that a label is added based on markdown change', async () => {
    // files that include a markdown file
    const prFilesMarkdown = require('./fixtures/prFiles-markdown.json')

    doNockGetAccessToken()
    doNockConfigRequests()

    nock('https://api.github.com')
      .log(console.log)
      .get('/repos/jhancock93/probot-test/pulls/1/files')
      .reply(200, prFilesMarkdown.data)

    // Test that a label is applied
    nock('https://api.guthub.com')
      .patch('/repos/jhancock93/probot-test/issues/1', (body) => {
        expect(body).toMatchObject({ labels: ['docs'] })
        return true
      })
      .reply(200)

    await probot.receive({ name: 'pull_request.opened', payload: pullRequest1 })
    console.error('pending mocks: %j', nock.pendingMocks())
    expect(nock.isDone()).toBe(true)
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
