const { logger } = require('@vestfoldfylke/loglady')
const { callArchive } = require('../call-archive')

module.exports = async (jobDef, flowStatus) => {
  logger.logConfig({
    prefix: 'handleCase'
  })
  logger.info('starting job')
  const getCaseParameter = jobDef.options?.getCaseParameter
  if (getCaseParameter) {
    logger.info('getCaseParameter is defined in options. Will use it.')
    const parameter = getCaseParameter(flowStatus)
    /* For azf-archive-v2
    const getCasePayload = {
      system: 'acos',
      template: 'get-case',
      parameter
    }
    */
    // for azf-archive-v1:
    const getCasePayload = {
      service: 'CaseService',
      method: 'GetCases',
      parameter,
      options: {
        onlyOpenCases: true
      }
    }
    const data = await callArchive('archive', getCasePayload)
    if (data.length >= 1) {
      if (data.length > 1) logger.warn('Found more than one case with getCase parameter using first in the list')
      logger.info('Found case with getCase parameter caseNumber {caseNumber}', data[0].CaseNumber)

      return {
        CaseNumber: data[0].CaseNumber,
        Recno: data[0].Recno
      }
    } else {
      logger.info('Could not find case with getCase parameter Will create new case')
    }

    // we did not find a case. Let's create one!
  }
  let payload
  const mapper = jobDef.options?.mapper
  if (mapper) {
    logger.info('Mapper is defined in options. Will use it.')
    payload = mapper(flowStatus)
  } else {
    logger.info('No mapper defined in options')
    throw new Error('No mapper defined in options for handleCase. Please provide a custom mapper in flow definition')
  }
  const data = await callArchive('archive', payload)
  logger.info('Successfully handled case {caseNumber}', data.CaseNumber)
  return data
}
