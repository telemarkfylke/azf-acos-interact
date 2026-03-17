const { dispatcher } = require('../lib/dispatcher')
const { logger } = require('@vestfoldfylke/loglady')

module.exports = async function (context, req) {
  logger.logConfig({
    prefix: 'azf-acos-interact - DispatcherDev'
  })
  try {
    const flowFilter = req.query?.flow || null
    const refFilter = req.query?.ref || null
    const deleteStatus = req.query?.deleteStatus === 'true'
    const results = await dispatcher(flowFilter, refFilter, deleteStatus)

    console.log('\n=== DispatcherDev Results ===')
    if (results.length === 0) console.log('No refs processed.')
    for (const r of results) {
      console.log(`\n[${r.acosId}] ${r.acosName} | refId: ${r.refId}`)
      console.log(`  finished: ${r.flowStatus?.finished} | failed: ${r.flowStatus?.failed} | runs: ${r.flowStatus?.runs}`)
      const jobErrors = Object.entries(r.flowStatus)
        .filter(([, v]) => typeof v === 'object' && v?.error)
        .map(([k, v]) => `    ${k}: ${v.error}`)
      if (jobErrors.length > 0) {
        console.log('  Errors:')
        jobErrors.forEach(e => console.log(e))
      }
    }
    console.log('\n=============================\n')
    return { status: 200, body: results }
  } catch (error) {
    console.log(error)
    return { status: 500, body: error }
  }
}
