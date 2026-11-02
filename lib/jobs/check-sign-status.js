const { logger } = require('@vestfoldfylke/loglady')
const { callSign } = require('../call-sign')

module.exports = async (jobDef, flowStatus) => {
  logger.logConfig({
    prefix: 'checkSignStatus'
  })

  const jobId = flowStatus.signDocument?.result?.jobId
  if (!jobId) throw new Error('No signJobId found in flowStatus')
  logger.info('Checking sign status for jobId {jobId}', jobId)

  const data = await callSign(`sign/status/${jobId}`, null, 'GET')

  return data
}
