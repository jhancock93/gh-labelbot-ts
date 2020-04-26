import { GitHubAPI } from 'probot' // eslint-disable-line no-unused-vars

export interface ILabelDefinition {
  name: string
  color: string
  description: string
}

export class RepositoryLabels {
  github: GitHubAPI
  repo: { owner: string, repo: string }

  constructor (github: GitHubAPI, owner: string, repo: string) {
    this.github = github
    this.repo = { owner: owner, repo: repo }
  }

  async fetchCurrentLabels (): Promise<ILabelDefinition[]> {
    var currentLabels: ILabelDefinition[] = []
    const currentLabelsRaw = await this.github.issues.listLabelsForRepo(this.repo)
    currentLabelsRaw.data.forEach(lbl => {
      const label = lbl as ILabelDefinition
      if (label.color !== undefined && label.color.length < 6) {
        label.color = label.color.padStart(6, '0')
      }
      currentLabels.push(label)
    })
    return currentLabels
  }

  static readLabelDefinitionsFromConfig (config: any): ILabelDefinition[] {
    var labels: ILabelDefinition[] = []
    const labelConfigs = config.labelDefinitions
    if (labelConfigs !== undefined) {
      labels = labelConfigs as ILabelDefinition[]
    }
    labels.forEach(lbl => {
      if (lbl.color !== undefined && ((typeof lbl.color !== 'string') || lbl.color.length < 6)) {
        lbl.color = lbl.color.toString().padStart(6, '0')
      }
    })
    return labels
  }

  static generateUpdates (currentLabels: ILabelDefinition[], desiredLabels: ILabelDefinition[]): { labelsToAdd: ILabelDefinition[], labelsToUpdate: ILabelDefinition[] } {
    var labelsToAdd: ILabelDefinition[] = []
    var labelsToUpdate: ILabelDefinition[] = []
    if (desiredLabels.length > 0) {
      desiredLabels.forEach(dlabel => {
        const existingLabel = currentLabels.find(l => l.name === dlabel.name)
        if (existingLabel !== undefined) {
          if (existingLabel.color !== dlabel.color || existingLabel.description !== dlabel.description) {
            labelsToUpdate.push(dlabel)
          }
        } else {
          labelsToAdd.push(dlabel)
        }
      })
    }
    return { labelsToAdd: labelsToAdd, labelsToUpdate: labelsToUpdate }
  }

  async syncLabels (desiredLabels: ILabelDefinition[]): Promise<any[]> {
    const currentLabels = await this.fetchCurrentLabels()
    var deltas = RepositoryLabels.generateUpdates(currentLabels, desiredLabels)
    const changes: Array<Promise<any>> = []
    deltas.labelsToAdd.forEach(add => {
      changes.push(this.github.issues.createLabel(Object.assign({}, add, this.repo)))
    })
    deltas.labelsToUpdate.forEach(update => {
      changes.push(this.github.issues.updateLabel(Object.assign({}, update, { current_name: update.name }, this.repo)))
    })
    return await Promise.all(changes)
  }
}
