const { logger } = require('@vestfoldfylke/loglady')
const { callArchive } = require('../call-archive')

module.exports = async (flowStatus) => {
  logger.logConfig({
    prefix: 'signOff'
  })
  logger.info('Signing off document')

  const documentNumber = flowStatus.archive?.result?.DocumentNumber
  if (!documentNumber) throw new Error('Could not find flowStatus.archive.result.DocumentNumber. Did you remember to enable the archive job for the flow?')

  const payload = {
    system: 'archive',
    template: 'signoff-TO',
    parameter: {
      documentNumber
    }
  }

  const data = await callArchive('archive', payload)
  logger.info('Successfully signed off document {documentNumber}', data.DocumentNumber)
  return data
}
