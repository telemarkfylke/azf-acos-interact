const { dispatcher } = require('../lib/dispatcher')
const { logger } = require('@vestfoldfylke/loglady')

module.exports = async function (context, req) {
  logger.logConfig({
    prefix: 'azf-acos-interact - Dispatcher'
  })
  try {
    const flowFilter = req.query?.flow || null
    const result = await dispatcher(flowFilter)
    return { status: 200, body: result }
  } catch (error) {
    console.log(error)
    return { status: 500, body: error }
  }
}
