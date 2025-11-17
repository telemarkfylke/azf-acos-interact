const { logger } = require('@vestfoldfylke/loglady')
const { callArchive } = require('../call-archive')

module.exports = async (jobDef, flowStatus) => {
  logger.logConfig({
    prefix: 'handleProject'
  })
  logger.info('Starting job')
  const getProjectParameter = jobDef.options?.getProjectParameter

  if (getProjectParameter) {
    logger.info('getProjectParameter is defined in options. Will use it.')
    const parameter = getProjectParameter(flowStatus)
    const getProjectPayload = {
      service: 'ProjectService',
      method: 'GetProjects',
      parameter
    }
    const data = await callArchive('archive', getProjectPayload)
    if (data.length >= 1) {
      if (data.length > 1) logger.warn('Found more than one project with getProject parameter - using first in the list')
      logger.info('Found project with getProject parameter. ProjectNumber: {projectNumber}', data[0].ProjectNumber)

      return {
        ProjectNumber: data[0].ProjectNumber,
        Recno: data[0].Recno
      }
    } else {
      logger.info('Could not find project with getProject parameter - Will create new project')
    }

    // we did not find a project. Let's create one!
  }
  let payload
  const mapper = jobDef.options?.mapper
  if (mapper) {
    logger.info('Mapper is defined in options. Will use it.')
    payload = mapper(flowStatus)
  } else {
    logger.info('No mapper defined in options')
    throw new Error('No mapper defined in options for handleProject. Please provide a custom mapper in flow definition')
  }
  const data = await callArchive('archive', payload)
  logger.info('Successfully handled project {projectNumber}', data.ProjectNumber)
  return data
}
