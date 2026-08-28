import { createZooclawClient } from '@zooclaw-agents/sdk'

const zc = createZooclawClient()
const [AGENT_ID, MODEL_SUBSTR] = process.argv.slice(2)
if (!AGENT_ID || !MODEL_SUBSTR) throw new Error('usage: node switch-model.mjs <agent_id> <model-substring>')

const models = await zc.listModels()
const model = models.find((m) => m.model.includes(MODEL_SUBSTR))?.model
if (!model) throw new Error(`no model matching "${MODEL_SUBSTR}" in ${models.map((m) => m.model).join(', ')}`)
console.log('switching to:', model)

// updateAgent 按 section merge，只送 model 不会动到 persona/skills
const updated = await zc.updateAgent(AGENT_ID, { model: { primary: model } })
console.log('config_version:', updated.status?.config_version)
console.log('declared.model:', JSON.stringify(updated.declared?.model))
