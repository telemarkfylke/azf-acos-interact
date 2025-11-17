const { remove, save } = require('@vtfk/azure-blob-client')
const { storageAccount } = require('../../config')
const { logger } = require('@vestfoldfylke/loglady')
const blobOptions = {
  connectionString: storageAccount.connectionString,
  containerName: storageAccount.containerName
}

module.exports = async (flowConfig, flowStatus) => {
  logger.logConfig({
    prefix: 'finishFlow'
  })
  if (flowConfig.doNotRemoveBlobs) {
    logger.info('Do not remove blobs is true. Will keep blobs, setting flow to finished')
    flowStatus.finished = true
    await save(`${flowStatus.blobDir}/${flowStatus.refId}-flow-status.json`, JSON.stringify(flowStatus, null, 2), blobOptions)
    logger.info('Successfully set flow to finished. All is good to go')
  } else {
    logger.info('delete-blobs deleting blobs for Acos form and refId')
    const result = await remove(`${flowStatus.acosId}/${flowStatus.refId}`, { ...blobOptions, excludeBlobNames: [`${flowStatus.refId}-flow-status.json`] })
    logger.info('Removed all blobs except flowStatus. It can now be removed - Successfully removed {numberOfBlobs} blob(s)', result.length)
    await remove(`${flowStatus.acosId}/${flowStatus.refId}`, blobOptions)
    logger.info('delete-blobs Finished successfully removed flow-status.json')
  }
  return 'Successfully finished flow'
}
