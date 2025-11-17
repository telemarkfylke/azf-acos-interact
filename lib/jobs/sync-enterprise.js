const { logger } = require('@vestfoldfylke/loglady')
const { callArchive } = require('../call-archive')

module.exports = async (jobDef, flowStatus) => {
  logger.logConfig({
    prefix: 'syncEnterprise'
  })
  let orgData
  const mapper = jobDef.options?.mapper
  if (mapper) {
    logger.info('Mapper is defined in options. Will use it.')
    orgData = mapper(flowStatus)
  } else {
    logger.error('No mapper or default mapper is defined in options')
    throw new Error('No mapper or default mapper is defined in options. Please provide a custom mapper in flow definition')
  }
  logger.info('syncing enterprise')
  const { orgnr } = orgData
  if (!orgnr) {
    throw new Error('Missing required parameters in returned object from mapper. Must have orgnr')
  }
  const payload = {
    orgnr
  }
  const data = await callArchive('SyncEnterprise', payload)
  logger.info('Successfully synced enterprise Recno {recno}', data.enterprise.recno)
  return data
}
