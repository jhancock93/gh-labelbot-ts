import Joi from '@hapi/joi'

const fields = {
  label: Joi.string().min(3).max(15)
    .description('Label to apply to all pull requests')
}

const schema = Joi.object().keys({
  label: fields.label.optional(),
  targetBranchLabels: Joi.object().pattern(fields.label,
    Joi.string().required()
  ).optional(),
  pathLabels: Joi.object().pattern(fields.label,
    Joi.array().items(Joi.string()).min(1).required()
  ).optional()
})

export class BotConfig {
  label?: string
  targetBranchLabels: Map<string, string>
  sourceBranchLabels: Map<string, string>
  pathLabels: Map<string, string[]>

  constructor(config: any) {
    this.targetBranchLabels = new Map<string, string>()
    this.sourceBranchLabels = new Map<string, string>()
    this.pathLabels = new Map<string, string[]>()

    schema.validate(config)

    if (config != null) {
      this.label = config?.label
      if (config.targetBranchLabels !== undefined) {
        for (const k of Object.keys(config.targetBranchLabels)) {
          this.targetBranchLabels.set(k, config.targetBranchLabels[k])
        }
      }
      if (config.sourceBranchLabels !== undefined) {
        for (const k of Object.keys(config.sourceBranchLabels)) {
          this.sourceBranchLabels.set(k, config.sourceBranchLabels[k])
        }
      }
      if (config.pathLabels !== undefined) {
        for (const k of Object.keys(config.pathLabels)) {
          this.pathLabels.set(k, config.pathLabels[k])
        }
      }
    }
  }
}
