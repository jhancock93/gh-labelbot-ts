const Joi = require('@hapi/joi')

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
    repo?: string;
    owner?: string;
    label?: string;
    targetBranchLabels: Map<string, string>;
    sourceBranchLabels: Map<string, string>;
    pathLabels: Map<string, Array<string>>;

    constructor(config: any, owner?: string, repo?: string) {
        owner = owner
        repo = repo
        schema.validate(config)
        this.label = config.label
        this.targetBranchLabels = new Map<string, string>()
        this.sourceBranchLabels = new Map<string, string>()
        this.pathLabels = new Map<string, Array<string>>()
        if (config.targetBranchLabels) {
            for (let k of Object.keys(config.targetBranchLabels)) {
                this.targetBranchLabels.set(k, config.targetBranchLabels[k])
            }
        }
        if (config.sourceBranchLabels) {
            for (let k of Object.keys(config.sourceBranchLabels)) {
                this.sourceBranchLabels.set(k, config.sourceBranchLabels[k])
            }
        }
        if (config.pathLabels) {
            for (let k of Object.keys(config.pathLabels)) {
                this.pathLabels.set(k, config.pathLabels[k])
            }
        }
    }
}